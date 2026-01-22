const verifyToken = require('./authMiddleware');
const requireRole = require('./roleMiddleware');

const authenticate = verifyToken;

const authorize = (roles) => {
    const roleList = Array.isArray(roles) ? roles : [roles];
    return requireRole(roleList);
};

module.exports = {
    authenticate,
    authorize
};
