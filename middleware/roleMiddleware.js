const { sendError } = require('../utils/responseHandler');

/**
 * Middleware to check if user has required role(s)
 * @param {Array<string>} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        // Ensure user is authenticated (should be checked by verifyToken first)
        if (!req.user) {
            return sendError(res, 401, 'Authentication required.');
        }

        // Check if user's role is in allowed roles
        if (!roles.includes(req.user.role)) {
            return sendError(
                res,
                403,
                `Access denied. Required role(s): ${roles.join(', ')}`
            );
        }

        next();
    };
};

module.exports = requireRole;
