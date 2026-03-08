const { SellerSettings, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get seller settings
 * GET /api/v1/seller/settings
 */
const getSellerSettings = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;

        let settings = await SellerSettings.findOne({ where: { seller_id } });

        // Create default settings if none exist
        if (!settings) {
            settings = await SellerSettings.create({ seller_id });
        }

        return sendSuccess(res, 200, 'Settings retrieved successfully', settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Update seller settings
 * PUT /api/v1/seller/settings
 */
const updateSellerSettings = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const updates = req.body;

        // Validate updates
        const allowedFields = [
            'can_self_deliver',
            'auto_accept_delivery',
            'preferred_delivery_radius_km',
            'delivery_fee_percentage',
            'notify_new_orders',
            'notify_delivery_assigned',
            'notify_delivery_completed',
            'business_hours',
            'preferred_agents',
            'blocked_agents'
        ];

        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        let settings = await SellerSettings.findOne({ where: { seller_id } });

        if (!settings) {
            settings = await SellerSettings.create({ seller_id, ...filteredUpdates });
        } else {
            await settings.update(filteredUpdates);
        }

        return sendSuccess(res, 200, 'Settings updated successfully', settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Add preferred agent
 * POST /api/v1/seller/settings/agents/preferred
 */
const addPreferredAgent = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { agent_id } = req.body;

        if (!agent_id) {
            return sendError(res, 400, 'Agent ID is required');
        }

        // Verify agent exists
        const agent = await User.findByPk(agent_id);
        if (!agent || agent.role !== 'Agent') {
            return sendError(res, 400, 'Invalid agent');
        }

        let settings = await SellerSettings.findOne({ where: { seller_id } });
        
        if (!settings) {
            settings = await SellerSettings.create({ seller_id });
        }

        const preferredAgents = settings.preferred_agents || [];

        if (!preferredAgents.includes(agent_id)) {
            preferredAgents.push(agent_id);
            await settings.update({ preferred_agents: preferredAgents });
        }

        return sendSuccess(res, 200, 'Agent added to preferred list', settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Remove preferred agent
 * DELETE /api/v1/seller/settings/agents/preferred/:agentId
 */
const removePreferredAgent = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { agentId } = req.params;

        const settings = await SellerSettings.findOne({ where: { seller_id } });
        
        if (!settings) {
            return sendError(res, 404, 'Settings not found');
        }

        const preferredAgents = settings.preferred_agents || [];
        const updatedAgents = preferredAgents.filter(id => id !== agentId);

        await settings.update({ preferred_agents: updatedAgents });

        return sendSuccess(res, 200, 'Agent removed from preferred list', settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Block agent
 * POST /api/v1/seller/settings/agents/blocked
 */
const blockAgent = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;
        const { agent_id } = req.body;

        if (!agent_id) {
            return sendError(res, 400, 'Agent ID is required');
        }

        let settings = await SellerSettings.findOne({ where: { seller_id } });
        
        if (!settings) {
            settings = await SellerSettings.create({ seller_id });
        }

        const blockedAgents = settings.blocked_agents || [];

        if (!blockedAgents.includes(agent_id)) {
            blockedAgents.push(agent_id);
            await settings.update({ blocked_agents: blockedAgents });
        }

        return sendSuccess(res, 200, 'Agent blocked successfully', settings);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSellerSettings,
    updateSellerSettings,
    addPreferredAgent,
    removePreferredAgent,
    blockAgent
};
