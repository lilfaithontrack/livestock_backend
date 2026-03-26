const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { sendError } = require('../utils/responseHandler');
const { User, SellerDeliveryAgent } = require('../models');

/**
 * Middleware to verify JWT token
 * Handles both User tokens (user_id) and SellerDeliveryAgent tokens (agent_id)
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return sendError(res, 401, 'Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, jwtConfig.secret);

        // Delivery agent token (has agent_id, no user_id)
        if (decoded.agent_id) {
            const agent = await SellerDeliveryAgent.findByPk(decoded.agent_id, {
                attributes: ['agent_id', 'full_name', 'email', 'phone', 'is_active', 'seller_id']
            });

            if (!agent || !agent.is_active) {
                return sendError(res, 401, 'Delivery agent not found or deactivated.');
            }

            req.user = {
                user_id: agent.agent_id,
                agent_id: agent.agent_id,
                role: 'Agent',
                email: agent.email,
                phone: agent.phone,
                full_name: agent.full_name,
                seller_id: agent.seller_id
            };

            return next();
        }

        // Regular user token (has user_id)
        const user = await User.findByPk(decoded.user_id, {
            attributes: ['user_id', 'role', 'email', 'phone', 'kyc_status']
        });

        if (!user) {
            return sendError(res, 401, 'User not found.');
        }

        req.user = {
            user_id: user.user_id,
            role: user.role,
            email: user.email,
            phone: user.phone,
            kyc_status: user.kyc_status
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return sendError(res, 401, 'Invalid token.');
        }
        if (error.name === 'TokenExpiredError') {
            return sendError(res, 401, 'Token expired.');
        }
        return sendError(res, 401, 'Invalid or expired token.');
    }
};

module.exports = verifyToken;
