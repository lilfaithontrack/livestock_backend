const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { sendError } = require('../utils/responseHandler');
const { User } = require('../models');

/**
 * Middleware to verify JWT token
 * Attaches user data to req.user if valid
 * Also refreshes role from database to handle role changes
 */
const verifyToken = async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return sendError(res, 401, 'Access denied. No token provided.');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, jwtConfig.secret);
        
        // Fetch fresh user data from database to get updated role
        // This ensures role changes (e.g., Buyer -> Seller) are reflected immediately
        const user = await User.findByPk(decoded.user_id, {
            attributes: ['user_id', 'role', 'email', 'phone', 'kyc_status']
        });
        
        if (!user) {
            return sendError(res, 401, 'User not found.');
        }
        
        // Attach user data to request with fresh role from database
        req.user = {
            user_id: user.user_id,
            role: user.role, // Use fresh role from database
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
