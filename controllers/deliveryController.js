const { Delivery, Order, User, OrderItem, Product } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateOTP, hashOTP, verifyOTP, getOTPExpiration } = require('../utils/otpGenerator');
const { generateOrderQR, verifyQRCode, generateDeliveryOTP, verifyDeliveryOTP } = require('../utils/qrGenerator');
const { calculateDistance, findNearbyAgents } = require('../utils/geocoding');
const { Op } = require('sequelize');
const { createAgentEarning } = require('./agentEarningsController');

/**
 * Assign delivery to agent (Admin only)
 * POST /api/v1/admin/deliveries/assign
 */
const assignDelivery = async (req, res, next) => {
    try {
        const { order_id, agent_id, start_location, end_location } = req.body;
        const admin_id = req.user.user_id;

        // Verify order exists
        const order = await Order.findByPk(order_id);
        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        // Verify agent exists and has Agent role
        const agent = await User.findByPk(agent_id);
        if (!agent || agent.role !== 'Agent') {
            return sendError(res, 400, 'Invalid agent');
        }

        // Generate OTP for delivery verification
        const otp = generateOTP();
        const otp_code_hash = await hashOTP(otp);
        const otp_expires_at = getOTPExpiration();

        // Create delivery
        const delivery = await Delivery.create({
            order_id,
            agent_id,
            admin_assigned_by: admin_id,
            start_location,
            end_location,
            status: 'Assigned',
            otp_code_hash,
            otp_expires_at
        });

        // TODO: Send OTP to buyer via SMS
        console.log(`Delivery OTP for order ${order_id}: ${otp}`);

        return sendSuccess(res, 201, 'Delivery assigned successfully', {
            delivery_id: delivery.delivery_id,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get agent's assigned deliveries
 * GET /api/v1/agent/deliveries/:agentId
 */
const getAgentDeliveries = async (req, res, next) => {
    try {
        const { agentId } = req.params;

        // Ensure agent can only see own deliveries
        if (req.user.role === 'Agent' && req.user.user_id !== agentId) {
            return sendError(res, 403, 'You can only view your own deliveries');
        }

        const deliveries = await Delivery.findAll({
            where: { agent_id: agentId },
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'buyer',
                            attributes: ['user_id', 'phone', 'address']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Deliveries retrieved successfully', { deliveries });
    } catch (error) {
        next(error);
    }
};

/**
 * Start delivery trip
 * POST /api/v1/delivery/start/:deliveryId
 */
const startTrip = async (req, res, next) => {
    try {
        const { deliveryId } = req.params;
        const agent_id = req.user.user_id;

        const delivery = await Delivery.findByPk(deliveryId);

        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        if (delivery.agent_id !== agent_id) {
            return sendError(res, 403, 'You are not assigned to this delivery');
        }

        delivery.status = 'In_Transit';
        await delivery.save();

        return sendSuccess(res, 200, 'Delivery trip started', {
            delivery_id: delivery.delivery_id,
            status: delivery.status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify OTP/QR and complete delivery
 * POST /api/v1/delivery/handover/:deliveryId
 */
const verifyHandover = async (req, res, next) => {
    try {
        const { deliveryId } = req.params;
        const { verification_type, verification_value } = req.body; // OTP or QR
        const agent_id = req.user.user_id;

        if (!verification_type || !verification_value) {
            return sendError(res, 400, 'Verification type and value are required');
        }

        const delivery = await Delivery.findByPk(deliveryId, {
            include: [
                {
                    model: Order,
                    as: 'order'
                }
            ]
        });

        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        if (delivery.agent_id !== agent_id) {
            return sendError(res, 403, 'You are not assigned to this delivery');
        }

        // Check OTP expiration
        if (new Date() > new Date(delivery.otp_expires_at)) {
            return sendError(res, 400, 'OTP expired. Please contact admin.');
        }

        let isValid = false;

        if (verification_type === 'OTP') {
            isValid = await verifyOTP(verification_value, delivery.otp_code_hash);
        } else if (verification_type === 'QR') {
            isValid = await verifyOTP(verification_value, delivery.qr_code_hash);
        } else {
            return sendError(res, 400, 'Invalid verification type. Use OTP or QR.');
        }

        if (!isValid) {
            return sendError(res, 401, 'Invalid verification code');
        }

        // Update delivery status
        delivery.status = 'Delivered';
        await delivery.save();

        // Update order status
        const order = delivery.order;
        order.order_status = 'Delivered';
        await order.save();

        // TODO: Trigger seller payout calculation logic

        return sendSuccess(res, 200, 'Delivery confirmed successfully', {
            delivery_id: delivery.delivery_id,
            order_id: order.order_id,
            status: delivery.status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all deliveries (Admin)
 * GET /api/v1/deliveries
 */
const getAllDeliveries = async (req, res, next) => {
    try {
        const deliveries = await Delivery.findAll({
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'buyer',
                            attributes: ['user_id', 'phone', 'email']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'agent',
                    attributes: ['user_id', 'email', 'phone']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Deliveries retrieved successfully', deliveries);
    } catch (error) {
        next(error);
    }
};

/**
 * Update delivery status (Admin/Agent)
 * PUT /api/v1/deliveries/:id/status
 */
const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Assigned', 'In_Transit', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return sendError(res, 400, 'Invalid status');
        }

        const delivery = await Delivery.findByPk(id);
        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        delivery.status = status;
        await delivery.save();

        return sendSuccess(res, 200, 'Delivery status updated', {
            delivery_id: delivery.delivery_id,
            status: delivery.status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get delivery by ID
 * GET /api/v1/deliveries/:id
 */
const getDeliveryById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const delivery = await Delivery.findByPk(id, {
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'buyer',
                            attributes: ['user_id', 'phone', 'email', 'address']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'agent',
                    attributes: ['user_id', 'email', 'phone']
                },
                {
                    model: User,
                    as: 'admin',
                    attributes: ['user_id', 'email']
                }
            ]
        });

        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        return sendSuccess(res, 200, 'Delivery retrieved successfully', { delivery });
    } catch (error) {
        next(error);
    }
};

/**
 * Update delivery details (Admin only)
 * PUT /api/v1/deliveries/:id
 */
const updateDelivery = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { agent_id, start_location, end_location, status } = req.body;

        const delivery = await Delivery.findByPk(id);
        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        // Validate new agent if provided
        if (agent_id && agent_id !== delivery.agent_id) {
            const agent = await User.findByPk(agent_id);
            if (!agent || agent.role !== 'Agent') {
                return sendError(res, 400, 'Invalid agent');
            }
            delivery.agent_id = agent_id;
        }

        // Update fields
        if (start_location !== undefined) delivery.start_location = start_location;
        if (end_location !== undefined) delivery.end_location = end_location;
        if (status !== undefined) {
            const validStatuses = ['Pending', 'Assigned', 'In_Transit', 'Delivered', 'Failed'];
            if (!validStatuses.includes(status)) {
                return sendError(res, 400, 'Invalid status');
            }
            delivery.status = status;
        }

        await delivery.save();

        return sendSuccess(res, 200, 'Delivery updated successfully', { delivery });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete delivery (Admin only)
 * DELETE /api/v1/deliveries/:id
 */
const deleteDelivery = async (req, res, next) => {
    try {
        const { id } = req.params;

        const delivery = await Delivery.findByPk(id);
        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        // Only allow deletion if delivery is not completed
        if (delivery.status === 'Delivered') {
            return sendError(res, 400, 'Cannot delete completed delivery');
        }

        await delivery.destroy();

        return sendSuccess(res, 200, 'Delivery deleted successfully', {});
    } catch (error) {
        next(error);
    }
};

/**
 * Approve order for delivery (Admin only)
 * Generates QR code and OTP for verification
 * POST /api/v1/admin/orders/:id/approve-delivery
 */
const approveOrderForDelivery = async (req, res, next) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;

        const order = await Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: User, as: 'seller', attributes: ['user_id', 'email', 'phone', 'address'] }
                    ]
                },
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'email', 'phone', 'address']
                }
            ]
        });

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.payment_status !== 'Paid') {
            return sendError(res, 400, 'Order must be paid before approval');
        }

        if (order.order_status !== 'Placed' && order.order_status !== 'Paid') {
            return sendError(res, 400, `Order cannot be approved. Current status: ${order.order_status}`);
        }

        // Generate QR code and OTP
        const { qrCode, qrCodeHash } = generateOrderQR(order.order_id);
        const { otp, otpHash, expiresAt } = generateDeliveryOTP();

        // Update order
        await order.update({
            order_status: 'Approved',
            qr_code: qrCode,
            qr_code_hash: qrCodeHash,
            delivery_otp_hash: otpHash,
            delivery_otp_expires_at: expiresAt,
            approved_at: new Date(),
            approved_by: admin_id
        });

        // TODO: Send notification to buyer with QR code
        // TODO: Send notification to seller about approved order
        console.log(`Order ${order.order_id} approved. OTP: ${otp}`);

        return sendSuccess(res, 200, 'Order approved for delivery', {
            order_id: order.order_id,
            order_status: 'Approved',
            qr_code: qrCode,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            otp_expires_at: expiresAt
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get approved orders pending delivery assignment
 * GET /api/v1/admin/orders/approved
 */
const getApprovedOrders = async (req, res, next) => {
    try {
        const orders = await Order.findAll({
            where: {
                order_status: { [Op.in]: ['Approved', 'Paid'] },
                delivery_type: 'platform',
                assigned_agent_id: null
            },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: User, as: 'seller', attributes: ['user_id', 'email', 'phone', 'address'] }
                    ]
                },
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'email', 'phone', 'address']
                }
            ],
            order: [['approved_at', 'ASC']]
        });

        return sendSuccess(res, 200, 'Approved orders retrieved', { orders });
    } catch (error) {
        next(error);
    }
};

/**
 * Assign delivery agent to order
 * POST /api/v1/admin/orders/:id/assign-agent
 */
const assignAgentToOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { agent_id, auto_assign } = req.body;
        const admin_id = req.user.user_id;

        const order = await Order.findByPk(id);

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.order_status !== 'Approved' && order.order_status !== 'Paid') {
            return sendError(res, 400, 'Order must be approved or paid before assigning agent');
        }

        let selectedAgentId = agent_id;

        // Auto-assign to nearest available agent
        if (auto_assign && !agent_id) {
            if (!order.buyer_location_lat || !order.buyer_location_lng) {
                return sendError(res, 400, 'Buyer location required for auto-assignment');
            }

            const nearbyAgents = await findNearbyAgents(
                User,
                parseFloat(order.buyer_location_lat),
                parseFloat(order.buyer_location_lng),
                20 // 20km radius
            );

            if (nearbyAgents.length === 0) {
                return sendError(res, 404, 'No available agents nearby');
            }

            selectedAgentId = nearbyAgents[0].user_id;
        }

        if (!selectedAgentId) {
            return sendError(res, 400, 'Agent ID required or enable auto_assign');
        }

        // Verify agent
        const agent = await User.findByPk(selectedAgentId);
        if (!agent || agent.role !== 'Agent') {
            return sendError(res, 400, 'Invalid agent');
        }

        // Update order
        // Update order
        const updateData = {
            order_status: 'Assigned',
            assigned_agent_id: selectedAgentId,
            delivery_type: 'platform'
        };

        // If order was only Paid, generate QR/OTP now (auto-approve)
        if (order.order_status === 'Paid') {
            const { qrCode, qrCodeHash } = generateOrderQR(order.order_id);
            const { otp, otpHash, expiresAt } = generateDeliveryOTP();

            Object.assign(updateData, {
                qr_code: qrCode,
                qr_code_hash: qrCodeHash,
                delivery_otp_hash: otpHash,
                delivery_otp_expires_at: expiresAt,
                approved_at: new Date(),
                approved_by: admin_id
            });

            console.log(`Order ${order.order_id} auto-approved during assignment. OTP: ${otp}`);
        }

        await order.update(updateData);

        // Create delivery record
        const delivery = await Delivery.create({
            order_id: order.order_id,
            agent_id: selectedAgentId,
            admin_assigned_by: admin_id,
            start_location: order.shipping_address,
            end_location: order.shipping_address,
            status: 'Assigned'
        });

        // TODO: Send notification to agent about new assignment

        return sendSuccess(res, 200, 'Agent assigned successfully', {
            order_id: order.order_id,
            agent_id: selectedAgentId,
            delivery_id: delivery.delivery_id
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Seller opts to deliver their own order
 * POST /api/v1/seller/orders/:id/self-deliver
 */
const sellerSelfDeliver = async (req, res, next) => {
    try {
        const { id } = req.params;
        const seller_id = req.user.user_id;

        const order = await Order.findByPk(id, {
            include: [{
                model: OrderItem,
                as: 'items',
                where: { seller_id },
                required: true
            }]
        });

        if (!order) {
            return sendError(res, 404, 'Order not found or you are not the seller');
        }

        if (order.order_status !== 'Approved') {
            return sendError(res, 400, 'Order must be approved before self-delivery');
        }

        if (order.assigned_agent_id) {
            return sendError(res, 400, 'Order already has an assigned agent');
        }

        // Update order for seller delivery
        await order.update({
            order_status: 'Assigned',
            delivery_type: 'seller',
            seller_can_deliver: true,
            assigned_agent_id: seller_id
        });

        // Create delivery record with seller as agent
        const delivery = await Delivery.create({
            order_id: order.order_id,
            agent_id: seller_id,
            status: 'Assigned'
        });

        return sendSuccess(res, 200, 'Self-delivery confirmed', {
            order_id: order.order_id,
            delivery_id: delivery.delivery_id,
            message: 'You can now deliver this order yourself'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get nearby available agents
 * GET /api/v1/admin/agents/nearby
 */
const getNearbyAgents = async (req, res, next) => {
    try {
        const { lat, lng, radius_km = 10 } = req.query;

        if (!lat || !lng) {
            return sendError(res, 400, 'Latitude and longitude required');
        }

        const agents = await findNearbyAgents(
            User,
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(radius_km)
        );

        return sendSuccess(res, 200, 'Nearby agents retrieved', { agents });
    } catch (error) {
        next(error);
    }
};

/**
 * Agent confirms pickup from seller
 * POST /api/v1/agent/orders/:id/pickup
 */
const confirmPickup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const agent_id = req.user.user_id;

        const order = await Order.findByPk(id);

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.assigned_agent_id !== agent_id) {
            return sendError(res, 403, 'You are not assigned to this order');
        }

        if (order.order_status !== 'Assigned') {
            return sendError(res, 400, 'Order must be in Assigned status');
        }

        // Update order status
        await order.update({
            order_status: 'In_Transit',
            picked_up_at: new Date()
        });

        // Update delivery status
        await Delivery.update(
            {
                status: 'In_Transit',
                pickup_confirmed_at: new Date()
            },
            { where: { order_id: id, agent_id } }
        );

        // TODO: Send notification to buyer that order is on the way

        return sendSuccess(res, 200, 'Pickup confirmed', {
            order_id: order.order_id,
            order_status: 'In_Transit'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify delivery with QR code or OTP
 * POST /api/v1/agent/orders/:id/verify-delivery
 */
const verifyDelivery = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { verification_type, code } = req.body;
        const agent_id = req.user.user_id;

        if (!verification_type || !code) {
            return sendError(res, 400, 'Verification type and code required');
        }

        if (!['qr', 'otp'].includes(verification_type)) {
            return sendError(res, 400, 'Invalid verification type. Use "qr" or "otp"');
        }

        const order = await Order.findByPk(id);

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.assigned_agent_id !== agent_id) {
            return sendError(res, 403, 'You are not assigned to this order');
        }

        if (order.order_status !== 'In_Transit') {
            return sendError(res, 400, 'Order must be in transit to verify delivery');
        }

        let isValid = false;

        if (verification_type === 'qr') {
            isValid = verifyQRCode(code, order.qr_code_hash);
        } else if (verification_type === 'otp') {
            const result = verifyDeliveryOTP(code, order.delivery_otp_hash, order.delivery_otp_expires_at);
            if (result.expired) {
                return sendError(res, 400, 'OTP has expired. Please request a new one.');
            }
            isValid = result.valid;
        }

        if (!isValid) {
            return sendError(res, 401, 'Invalid verification code');
        }

        // Complete the delivery
        await order.update({
            order_status: 'Delivered',
            delivered_at: new Date()
        });

        // Update delivery record
        const delivery = await Delivery.findOne({ where: { order_id: id, agent_id } });
        await Delivery.update(
            {
                status: 'Delivered',
                delivery_confirmed_at: new Date(),
                verification_method: verification_type
            },
            { where: { order_id: id, agent_id } }
        );

        // Create agent earnings for this delivery
        let agentEarning = null;
        try {
            agentEarning = await createAgentEarning(
                order.order_id,
                agent_id,
                delivery?.delivery_id,
                order.delivery_distance_km
            );
        } catch (earningError) {
            console.error('Error creating agent earning:', earningError);
            // Don't fail the delivery verification if earnings creation fails
        }

        // TODO: Send notification to buyer and seller about completed delivery

        return sendSuccess(res, 200, 'Delivery verified and completed', {
            order_id: order.order_id,
            order_status: 'Delivered',
            verified_at: new Date(),
            earning: agentEarning ? {
                earning_id: agentEarning.earning_id,
                net_amount: parseFloat(agentEarning.net_amount),
                delivery_fee: parseFloat(agentEarning.delivery_fee)
            } : null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get order QR code for buyer
 * GET /api/v1/orders/:id/qr-code
 */
const getOrderQRCode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const buyer_id = req.user.user_id;

        const order = await Order.findByPk(id);

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.buyer_id !== buyer_id) {
            return sendError(res, 403, 'You can only view QR code for your own orders');
        }

        if (!order.qr_code) {
            return sendError(res, 400, 'QR code not yet generated. Order must be approved first.');
        }

        // Return QR data that can be rendered as QR code on client
        const qrData = JSON.stringify({
            order_id: order.order_id,
            code: order.qr_code,
            timestamp: Date.now()
        });

        return sendSuccess(res, 200, 'QR code retrieved', {
            order_id: order.order_id,
            qr_data: qrData,
            qr_code: order.qr_code
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resend delivery OTP
 * POST /api/v1/orders/:id/resend-otp
 */
const resendDeliveryOTP = async (req, res, next) => {
    try {
        const { id } = req.params;
        const buyer_id = req.user.user_id;

        const order = await Order.findByPk(id);

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.buyer_id !== buyer_id) {
            return sendError(res, 403, 'You can only request OTP for your own orders');
        }

        if (!['Approved', 'Assigned', 'In_Transit'].includes(order.order_status)) {
            return sendError(res, 400, 'Cannot resend OTP for this order status');
        }

        // Generate new OTP
        const { otp, otpHash, expiresAt } = generateDeliveryOTP();

        await order.update({
            delivery_otp_hash: otpHash,
            delivery_otp_expires_at: expiresAt
        });

        // TODO: Send OTP via SMS/notification to buyer
        console.log(`New OTP for order ${order.order_id}: ${otp}`);

        return sendSuccess(res, 200, 'OTP resent successfully', {
            order_id: order.order_id,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            expires_at: expiresAt
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update agent location
 * PUT /api/v1/agent/location
 */
const updateAgentLocation = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;
        const { lat, lng, is_online } = req.body;

        if (lat === undefined || lng === undefined) {
            return sendError(res, 400, 'Latitude and longitude required');
        }

        await User.update(
            {
                current_lat: lat,
                current_lng: lng,
                is_online: is_online !== undefined ? is_online : true,
                last_location_update: new Date()
            },
            { where: { user_id: agent_id } }
        );

        return sendSuccess(res, 200, 'Location updated', {
            lat,
            lng,
            is_online: is_online !== undefined ? is_online : true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get agent's assigned orders
 * GET /api/v1/agent/orders/assigned
 */
const getAgentAssignedOrders = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;

        const orders = await Order.findAll({
            where: {
                assigned_agent_id: agent_id,
                order_status: { [Op.in]: ['Assigned', 'In_Transit'] }
            },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: User, as: 'seller', attributes: ['user_id', 'email', 'phone', 'address'] }
                    ]
                },
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'email', 'phone', 'address', 'shipping_address']
                }
            ],
            order: [['approved_at', 'ASC']]
        });

        return sendSuccess(res, 200, 'Assigned orders retrieved', { orders });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    assignDelivery,
    getAgentDeliveries,
    startTrip,
    verifyHandover,
    getAllDeliveries,
    updateStatus,
    getDeliveryById,
    updateDelivery,
    deleteDelivery,
    approveOrderForDelivery,
    getApprovedOrders,
    assignAgentToOrder,
    sellerSelfDeliver,
    getNearbyAgents,
    confirmPickup,
    verifyDelivery,
    getOrderQRCode,
    resendDeliveryOTP,
    updateAgentLocation,
    getAgentAssignedOrders
};
