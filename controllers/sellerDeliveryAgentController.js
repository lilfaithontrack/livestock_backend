const { SellerDeliveryAgent, Delivery, Order, OrderItem, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { Op } = require('sequelize');

/**
 * Register a new delivery agent (Seller)
 * POST /api/v1/seller/delivery-agents
 */
const registerAgent = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const {
            full_name,
            phone,
            email,
            national_id,
            vehicle_type,
            vehicle_plate,
            profile_photo_url
        } = req.body;

        if (!full_name || !phone) {
            return sendError(res, 400, 'Full name and phone are required');
        }

        // Check if phone already registered under this seller
        const existing = await SellerDeliveryAgent.findOne({
            where: { seller_id, phone }
        });
        if (existing) {
            return sendError(res, 400, 'An agent with this phone number is already registered');
        }

        const agent = await SellerDeliveryAgent.create({
            seller_id,
            full_name,
            phone,
            email: email || null,
            national_id: national_id || null,
            vehicle_type: vehicle_type || 'motorcycle',
            vehicle_plate: vehicle_plate || null,
            profile_photo_url: profile_photo_url || null,
            is_active: true,
            is_available: true
        });

        return sendSuccess(res, 201, 'Delivery agent registered successfully', { agent });
    } catch (error) {
        console.error('Error registering delivery agent:', error);
        next(error);
    }
};

/**
 * Get all delivery agents for the seller
 * GET /api/v1/seller/delivery-agents
 */
const getAgents = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { active, available } = req.query;

        const where = { seller_id };
        if (active !== undefined) where.is_active = active === 'true';
        if (available !== undefined) where.is_available = available === 'true';

        const agents = await SellerDeliveryAgent.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Delivery agents retrieved successfully', { agents });
    } catch (error) {
        console.error('Error fetching delivery agents:', error);
        next(error);
    }
};

/**
 * Get single delivery agent details
 * GET /api/v1/seller/delivery-agents/:id
 */
const getAgentById = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const agent = await SellerDeliveryAgent.findOne({
            where: { agent_id: id, seller_id },
            include: [{
                model: Delivery,
                as: 'deliveries',
                limit: 20,
                order: [['created_at', 'DESC']],
                include: [{
                    model: Order,
                    as: 'order',
                    attributes: ['order_id', 'total_amount', 'order_status', 'shipping_address']
                }]
            }]
        });

        if (!agent) {
            return sendError(res, 404, 'Delivery agent not found');
        }

        return sendSuccess(res, 200, 'Delivery agent retrieved successfully', { agent });
    } catch (error) {
        console.error('Error fetching delivery agent:', error);
        next(error);
    }
};

/**
 * Update delivery agent info
 * PUT /api/v1/seller/delivery-agents/:id
 */
const updateAgent = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;
        const updates = req.body;

        const agent = await SellerDeliveryAgent.findOne({
            where: { agent_id: id, seller_id }
        });

        if (!agent) {
            return sendError(res, 404, 'Delivery agent not found');
        }

        const allowedFields = [
            'full_name', 'phone', 'email', 'national_id',
            'vehicle_type', 'vehicle_plate', 'profile_photo_url'
        ];

        const filtered = {};
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                filtered[key] = updates[key];
            }
        });

        await agent.update(filtered);

        return sendSuccess(res, 200, 'Delivery agent updated successfully', { agent });
    } catch (error) {
        console.error('Error updating delivery agent:', error);
        next(error);
    }
};

/**
 * Deactivate delivery agent
 * DELETE /api/v1/seller/delivery-agents/:id
 */
const deactivateAgent = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const agent = await SellerDeliveryAgent.findOne({
            where: { agent_id: id, seller_id }
        });

        if (!agent) {
            return sendError(res, 404, 'Delivery agent not found');
        }

        await agent.update({ is_active: false, is_available: false });

        return sendSuccess(res, 200, 'Delivery agent deactivated successfully');
    } catch (error) {
        console.error('Error deactivating delivery agent:', error);
        next(error);
    }
};

/**
 * Toggle agent availability
 * PUT /api/v1/seller/delivery-agents/:id/availability
 */
const toggleAvailability = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;
        const { is_available } = req.body;

        const agent = await SellerDeliveryAgent.findOne({
            where: { agent_id: id, seller_id }
        });

        if (!agent) {
            return sendError(res, 404, 'Delivery agent not found');
        }

        if (!agent.is_active) {
            return sendError(res, 400, 'Cannot change availability of deactivated agent');
        }

        await agent.update({ is_available: is_available !== false });

        return sendSuccess(res, 200, `Agent is now ${agent.is_available ? 'available' : 'unavailable'}`, { agent });
    } catch (error) {
        console.error('Error toggling agent availability:', error);
        next(error);
    }
};

/**
 * Assign seller's own delivery agent to an order
 * POST /api/v1/seller/orders/:orderId/assign-agent
 */
const assignAgentToOrder = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { orderId } = req.params;
        const { agent_id, delivery_notes, pickup_location } = req.body;

        if (!agent_id) {
            return sendError(res, 400, 'Agent ID is required');
        }

        // Verify agent belongs to seller and is available
        const agent = await SellerDeliveryAgent.findOne({
            where: { agent_id, seller_id, is_active: true }
        });

        if (!agent) {
            return sendError(res, 404, 'Delivery agent not found or inactive');
        }

        if (!agent.is_available) {
            return sendError(res, 400, 'This delivery agent is currently unavailable');
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

        if (!['Paid', 'Approved', 'Placed'].includes(order.order_status)) {
            return sendError(res, 400, 'Order is not in a valid state for delivery assignment');
        }

        // Check if delivery already exists for this order
        let delivery = await Delivery.findOne({ where: { order_id: orderId } });

        if (delivery && delivery.status !== 'Pending' && delivery.status !== 'Cancelled') {
            return sendError(res, 400, 'Delivery is already assigned or in progress');
        }

        if (delivery) {
            // Update existing pending delivery
            await delivery.update({
                seller_delivery_agent_id: agent_id,
                seller_assigned_by: seller_id,
                assignment_type: 'seller',
                status: 'Assigned',
                delivery_notes: delivery_notes || delivery.delivery_notes,
                pickup_location: pickup_location || delivery.pickup_location
            });
        } else {
            // Create new delivery record
            delivery = await Delivery.create({
                order_id: orderId,
                seller_delivery_agent_id: agent_id,
                seller_assigned_by: seller_id,
                assignment_type: 'seller',
                status: 'Assigned',
                delivery_notes: delivery_notes || null,
                pickup_location: pickup_location || null,
                delivery_location: order.buyer ? {
                    address: order.shipping_address || order.buyer.address
                } : null
            });
        }

        // Update order status
        await order.update({ order_status: 'Assigned' });

        // Mark agent as unavailable during delivery
        await agent.update({ is_available: false });

        return sendSuccess(res, 200, 'Delivery agent assigned successfully', {
            delivery,
            agent: {
                agent_id: agent.agent_id,
                full_name: agent.full_name,
                phone: agent.phone,
                vehicle_type: agent.vehicle_type
            }
        });
    } catch (error) {
        console.error('Error assigning agent to order:', error);
        next(error);
    }
};

/**
 * Get all active deliveries for seller's agents
 * GET /api/v1/seller/delivery-tracking
 */
const getDeliveryTracking = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { status } = req.query;

        const where = { seller_assigned_by: seller_id };
        if (status) {
            where.status = status;
        }

        const deliveries = await Delivery.findAll({
            where,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['order_id', 'total_amount', 'order_status', 'shipping_address', 'shipping_phone']
                },
                {
                    model: SellerDeliveryAgent,
                    as: 'seller_agent',
                    attributes: ['agent_id', 'full_name', 'phone', 'vehicle_type', 'current_lat', 'current_lng']
                }
            ]
        });

        return sendSuccess(res, 200, 'Delivery tracking retrieved successfully', { deliveries });
    } catch (error) {
        console.error('Error fetching delivery tracking:', error);
        next(error);
    }
};

/**
 * Get delivery agent stats
 * GET /api/v1/seller/delivery-agents/:id/stats
 */
const getAgentStats = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const agent = await SellerDeliveryAgent.findOne({
            where: { agent_id: id, seller_id }
        });

        if (!agent) {
            return sendError(res, 404, 'Delivery agent not found');
        }

        const totalDeliveries = await Delivery.count({
            where: { seller_delivery_agent_id: id }
        });

        const completedDeliveries = await Delivery.count({
            where: { seller_delivery_agent_id: id, status: 'Delivered' }
        });

        const activeDeliveries = await Delivery.count({
            where: {
                seller_delivery_agent_id: id,
                status: { [Op.in]: ['Assigned', 'In_Transit'] }
            }
        });

        const failedDeliveries = await Delivery.count({
            where: { seller_delivery_agent_id: id, status: 'Failed' }
        });

        return sendSuccess(res, 200, 'Agent stats retrieved successfully', {
            agent_id: id,
            full_name: agent.full_name,
            total_deliveries: totalDeliveries,
            completed_deliveries: completedDeliveries,
            active_deliveries: activeDeliveries,
            failed_deliveries: failedDeliveries,
            success_rate: totalDeliveries > 0
                ? Math.round((completedDeliveries / totalDeliveries) * 100)
                : 0,
            rating: agent.rating
        });
    } catch (error) {
        console.error('Error fetching agent stats:', error);
        next(error);
    }
};

module.exports = {
    registerAgent,
    getAgents,
    getAgentById,
    updateAgent,
    deactivateAgent,
    toggleAvailability,
    assignAgentToOrder,
    getDeliveryTracking,
    getAgentStats
};
