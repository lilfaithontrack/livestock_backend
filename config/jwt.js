require('dotenv').config();

module.exports = {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    // Default ~1 year so mobile/web sessions rarely expire during normal use (override with JWT_EXPIRE)
    expiresIn: process.env.JWT_EXPIRE || '365d'
};
