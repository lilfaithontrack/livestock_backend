const { Delivery, Order, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateOTP, hashOTP, verifyOTP, getOTPExpiration } = require('../utils/otpGenerator');

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

module.exports = {
    assignDelivery,
    getAgentDeliveries,
    startTrip,
    verifyHandover,
    getAllDeliveries,
    updateStatus,
    getDeliveryById,
    updateDelivery,
    deleteDelivery
};
