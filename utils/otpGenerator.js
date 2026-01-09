const bcrypt = require('bcryptjs');

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash an OTP using bcrypt
 * @param {string} otp - Plain text OTP
 * @returns {Promise<string>} Hashed OTP
 */
const hashOTP = async (otp) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(otp, salt);
};

/**
 * Verify OTP against hash
 * @param {string} otp - Plain text OTP
 * @param {string} hash - Hashed OTP from database
 * @returns {Promise<boolean>} True if OTP matches
 */
const verifyOTP = async (otp, hash) => {
    return await bcrypt.compare(otp, hash);
};

/**
 * Get OTP expiration time
 * @returns {Date} Expiration timestamp (10 minutes from now)
 */
const getOTPExpiration = () => {
    const expiryMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
    return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

module.exports = {
    generateOTP,
    hashOTP,
    verifyOTP,
    getOTPExpiration
};
