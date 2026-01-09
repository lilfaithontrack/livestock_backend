require('dotenv').config();

module.exports = {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRE || '7d'
};
