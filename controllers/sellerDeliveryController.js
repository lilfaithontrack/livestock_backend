const { Delivery, Order, User, OrderItem, SellerSettings } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateOTP, hashOTP, getOTPExpiration } = require('../utils/otpGenerator');
const { generateOrderQR, generateDeliveryOTP } = require('../utils/qrGenerator');
const { findNearbyAgents } = require('../utils/geocoding');
const { Op } = require('sequelize');

/**
 * Register delivery for order (Seller)
 * POST /api/v1/seller/orders/:orderId/register-delivery
 */
const registerDelivery = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const seller_id = req.user.user_id;
        const { 
            delivery_type, // 'self' | 'agent' | 'platform'
            agent_id, 
            pickup_location,
            delivery_notes,
            estimated_pickup_time 
        } = req.body;

        if (!delivery_type) {
            return sendError(res, 400, 'Delivery type is required');
        }

        // Verify order belongs to seller
        const order = await Order.findByPk(orderId, {
            include: [{
                model: OrderItem,
                as: 'items',
                where: { seller_id },
                required: true
            }, {
                model: User,
                as: 'buyer',
                attributes: ['user_id', 'email', 'phone', 'address']
            }]
        });

        if (!order) {
            return sendError(res, 404, 'Order not found or unauthorized');
        }

        if (order.order_status !== 'Paid' && order.order_status !== 'Approved') {
            return sendError(res, 400, 'Order must be paid before registering delivery');
        }

        // Check if delivery already exists
        const existingDelivery = await Delivery.findOne({ where: { order_id: orderId } });
        if (existingDelivery) {
            return sendError(res, 400, 'Delivery already registered for this order');
        }

        // Generate OTP for delivery verification
        const { otp, otpHash, expiresAt } = generateDeliveryOTP();
        const { qrCode, qrCodeHash } = generateOrderQR(orderId);

        let deliveryData = {
            order_id: orderId,
            seller_assigned_by: seller_id,
            assignment_type: 'seller',
            status: 'Pending',
            otp_code_hash: otpHash,
            otp_expires_at: expiresAt,
            qr_code_hash: qrCodeHash,
            seller_notes: delivery_notes,
            pickup_location,
            estimated_pickup_time
        };

        // Handle different delivery types
        if (delivery_type === 'self') {
            deliveryData.agent_id = seller_id;
            deliveryData.status = 'Assigned';
        } else if (delivery_type === 'agent' && agent_id) {
            // Verify agent
            const agent = await User.findByPk(agent_id);
            if (!agent || agent.role !== 'Agent') {
                return sendError(res, 400, 'Invalid agent');
            }
            deliveryData.agent_id = agent_id;
            deliveryData.status = 'Assigned';
        }

        // Create delivery
        const delivery = await Delivery.create(deliveryData);

        // Update order
        await order.update({
            order_status: 'Assigned',
            delivery_type: delivery_type === 'self' ? 'seller' : 'platform',
            seller_can_deliver: delivery_type === 'self',
            assigned_agent_id: deliveryData.agent_id,
            qr_code: qrCode,
            qr_code_hash: qrCodeHash,
            delivery_otp_hash: otpHash,
            delivery_otp_expires_at: expiresAt,
            approved_at: new Date()
        });

        console.log(`Delivery registered for order ${orderId} by seller ${seller_id}`);
        console.log(`Delivery type: ${delivery_type}, Agent: ${deliveryData.agent_id || 'None'}`);
        console.log(`OTP: ${otp} (expires: ${expiresAt})`);

        return sendSuccess(res, 201, 'Delivery registered successfully', {
            delivery_id: delivery.delivery_id,
            order_id: orderId,
            status: delivery.status,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            qr_code: process.env.NODE_ENV === 'development' ? qrCode : undefined
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get available agents for delivery
 * GET /api/v1/seller/delivery/available-agents
 */
const getAvailableAgents = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { lat, lng, radius_km = 10 } = req.query;

        // Get seller settings for preferred agents
        const settings = await SellerSettings.findOne({ where: { seller_id } });
        const preferredAgents = settings?.preferred_agents || [];
        const blockedAgents = settings?.blocked_agents || [];

        let agents;

        if (lat && lng) {
            // Find nearby agents
            agents = await findNearbyAgents(
                User,
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radius_km)
            );
        } else {
            // Get all active agents
            agents = await User.findAll({
                where: { 
                    role: 'Agent',
                    is_active: true
                },
                attributes: ['user_id', 'email', 'phone', 'address']
            });
        }

        // Filter out blocked agents and mark preferred ones
        const filteredAgents = agents
            .filter(agent => !blockedAgents.includes(agent.user_id))
            .map(agent => ({
                ...agent.toJSON(),
                is_preferred: preferredAgents.includes(agent.user_id)
            }))
            .sort((a, b) => (b.is_preferred ? 1 : 0) - (a.is_preferred ? 1 : 0));

        return sendSuccess(res, 200, 'Available agents retrieved', { 
            agents: filteredAgents,
            total: filteredAgents.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get seller's deliveries
 * GET /api/v1/seller/deliveries
 */
const getSellerDeliveries = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { status } = req.query;

        const whereClause = { seller_assigned_by: seller_id };
        if (status) {
            whereClause.status = status;
        }

        const deliveries = await Delivery.findAll({
            where: whereClause,
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'buyer',
                            attributes: ['user_id', 'phone', 'email', 'address']
                        },
                        {
                            model: OrderItem,
                            as: 'items',
                            include: ['product']
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

        return sendSuccess(res, 200, 'Deliveries retrieved successfully', { 
            deliveries,
            total: deliveries.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update delivery assignment
 * PUT /api/v1/seller/deliveries/:deliveryId/assign
 */
const updateDeliveryAssignment = async (req, res, next) => {
    try {
        const { deliveryId } = req.params;
        const seller_id = req.user.user_id;
        const { agent_id } = req.body;

        if (!agent_id) {
            return sendError(res, 400, 'Agent ID is required');
        }

        const delivery = await Delivery.findByPk(deliveryId);

        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        if (delivery.seller_assigned_by !== seller_id) {
            return sendError(res, 403, 'Unauthorized to modify this delivery');
        }

        if (delivery.status === 'Delivered' || delivery.status === 'Cancelled') {
            return sendError(res, 400, 'Cannot reassign completed or cancelled delivery');
        }

        // Verify agent
        const agent = await User.findByPk(agent_id);
        if (!agent || agent.role !== 'Agent') {
            return sendError(res, 400, 'Invalid agent');
        }

        await delivery.update({
            agent_id,
            status: 'Assigned'
        });

        // Update order
        await Order.update(
            { assigned_agent_id: agent_id },
            { where: { order_id: delivery.order_id } }
        );

        console.log(`Delivery ${deliveryId} reassigned to agent ${agent_id}`);

        return sendSuccess(res, 200, 'Delivery reassigned successfully', delivery);
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel delivery
 * PUT /api/v1/seller/deliveries/:deliveryId/cancel
 */
const cancelDelivery = async (req, res, next) => {
    try {
        const { deliveryId } = req.params;
        const seller_id = req.user.user_id;
        const { reason } = req.body;

        const delivery = await Delivery.findByPk(deliveryId);

        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        if (delivery.seller_assigned_by !== seller_id) {
            return sendError(res, 403, 'Unauthorized to cancel this delivery');
        }

        if (delivery.status === 'Delivered') {
            return sendError(res, 400, 'Cannot cancel delivered order');
        }

        if (delivery.status === 'In_Transit') {
            return sendError(res, 400, 'Cannot cancel delivery in transit. Please contact support.');
        }

        await delivery.update({
            status: 'Cancelled',
            seller_notes: reason || delivery.seller_notes
        });

        // Update order status
        await Order.update(
            { 
                order_status: 'Cancelled',
                assigned_agent_id: null
            },
            { where: { order_id: delivery.order_id } }
        );

        console.log(`Delivery ${deliveryId} cancelled by seller. Reason: ${reason}`);

        return sendSuccess(res, 200, 'Delivery cancelled successfully', delivery);
    } catch (error) {
        next(error);
    }
};

/**
 * Get delivery details
 * GET /api/v1/seller/deliveries/:deliveryId
 */
const getDeliveryDetails = async (req, res, next) => {
    try {
        const { deliveryId } = req.params;
        const seller_id = req.user.user_id;

        const delivery = await Delivery.findByPk(deliveryId, {
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'buyer',
                            attributes: ['user_id', 'phone', 'email', 'address']
                        },
                        {
                            model: OrderItem,
                            as: 'items',
                            include: ['product']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'agent',
                    attributes: ['user_id', 'email', 'phone', 'address']
                }
            ]
        });

        if (!delivery) {
            return sendError(res, 404, 'Delivery not found');
        }

        if (delivery.seller_assigned_by !== seller_id) {
            return sendError(res, 403, 'Unauthorized to view this delivery');
        }

        return sendSuccess(res, 200, 'Delivery details retrieved', delivery);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerDelivery,
    getAvailableAgents,
    getSellerDeliveries,
    updateDeliveryAssignment,
    cancelDelivery,
    getDeliveryDetails
};
