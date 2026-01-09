const { User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

/**
 * Get all delivery agents (Admin only)
 * GET /api/v1/agents
 */
const getAllAgents = async (req, res, next) => {
    try {
        const agents = await User.findAll({
            where: { role: 'Agent' },
            attributes: { exclude: ['password_hash'] },
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Agents retrieved successfully', {
            agents,
            count: agents.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get agent by ID
 * GET /api/v1/agents/:id
 */
const getAgentById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const agent = await User.findOne({
            where: {
                user_id: id,
                role: 'Agent'
            },
            attributes: { exclude: ['password_hash'] }
        });

        if (!agent) {
            return sendError(res, 404, 'Agent not found');
        }

        return sendSuccess(res, 200, 'Agent retrieved successfully', { agent });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new delivery agent (Admin only)
 * POST /api/v1/agents
 */
const createAgent = async (req, res, next) => {
    try {
        const { email, password, phone, address } = req.body;

        // Validate required fields
        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        // Check if agent already exists
        const existingAgent = await User.findOne({ where: { email } });
        if (existingAgent) {
            return sendError(res, 400, 'Agent with this email already exists');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create agent
        const agent = await User.create({
            email,
            password_hash,
            phone,
            address,
            role: 'Agent',
            kyc_status: false
        });

        return sendSuccess(res, 201, 'Delivery agent created successfully', {
            user_id: agent.user_id,
            email: agent.email,
            role: agent.role
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update agent (Admin only)
 * PUT /api/v1/agents/:id
 */
const updateAgent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, password, phone, address, kyc_status } = req.body;

        const agent = await User.findOne({
            where: {
                user_id: id,
                role: 'Agent'
            }
        });

        if (!agent) {
            return sendError(res, 404, 'Agent not found');
        }

        // Update fields
        if (email !== undefined) agent.email = email;
        if (phone !== undefined) agent.phone = phone;
        if (address !== undefined) agent.address = address;
        if (kyc_status !== undefined) agent.kyc_status = kyc_status;

        // Update password if provided
        if (password) {
            agent.password_hash = await bcrypt.hash(password, 10);
        }

        await agent.save();

        return sendSuccess(res, 200, 'Agent updated successfully', {
            user_id: agent.user_id,
            email: agent.email,
            phone: agent.phone,
            address: agent.address,
            kyc_status: agent.kyc_status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete agent (Admin only)
 * DELETE /api/v1/agents/:id
 */
const deleteAgent = async (req, res, next) => {
    try {
        const { id } = req.params;

        const agent = await User.findOne({
            where: {
                user_id: id,
                role: 'Agent'
            }
        });

        if (!agent) {
            return sendError(res, 404, 'Agent not found');
        }

        await agent.destroy();

        return sendSuccess(res, 200, 'Agent deleted successfully', {});
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent
};
