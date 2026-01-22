const crypto = require('crypto');

/**
 * Generate a unique QR code for order verification
 * @param {string} orderId - The order ID
 * @returns {Object} { qrCode, qrCodeHash, qrData }
 */
function generateOrderQR(orderId) {
    const uniqueCode = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    const qrData = JSON.stringify({
        order_id: orderId,
        code: uniqueCode,
        timestamp: timestamp
    });
    
    const qrCodeHash = crypto.createHash('sha256').update(uniqueCode).digest('hex');
    
    return {
        qrCode: uniqueCode,
        qrCodeHash: qrCodeHash,
        qrData: qrData
    };
}

/**
 * Verify a QR code against stored hash
 * @param {string} qrCode - The QR code to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {boolean} Whether the QR code is valid
 */
function verifyQRCode(qrCode, storedHash) {
    const hash = crypto.createHash('sha256').update(qrCode).digest('hex');
    return hash === storedHash;
}

/**
 * Generate a 6-digit OTP for delivery verification
 * @returns {Object} { otp, otpHash, expiresAt }
 */
function generateDeliveryOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    return {
        otp: otp,
        otpHash: otpHash,
        expiresAt: expiresAt
    };
}

/**
 * Verify an OTP against stored hash
 * @param {string} otp - The OTP to verify
 * @param {string} storedHash - The stored hash to compare against
 * @param {Date} expiresAt - The expiration timestamp
 * @returns {Object} { valid, expired }
 */
function verifyDeliveryOTP(otp, storedHash, expiresAt) {
    const isExpired = new Date() > new Date(expiresAt);
    if (isExpired) {
        return { valid: false, expired: true };
    }
    
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    return { valid: hash === storedHash, expired: false };
}

module.exports = {
    generateOrderQR,
    verifyQRCode,
    generateDeliveryOTP,
    verifyDeliveryOTP
};
