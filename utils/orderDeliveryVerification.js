const { Order } = require('../models');
const { generateOrderQR, generateDeliveryOTP } = require('./qrGenerator');

function shouldGenerateDeliveryCodes(order) {
    if (!order || order.payment_status !== 'Paid') return false;
    if (['Delivered', 'Cancelled'].includes(order.order_status)) return false;
    if (order.qr_code_hash) return false;
    return true;
}

/**
 * Mutates the Sequelize order instance (caller saves, e.g. within a transaction).
 * @returns {boolean} true if codes were attached
 */
function ensureDeliveryCodesOnOrderInstance(order) {
    if (!shouldGenerateDeliveryCodes(order)) return false;
    const { qrCode, qrCodeHash } = generateOrderQR(order.order_id);
    const { otp, otpHash, expiresAt } = generateDeliveryOTP();
    order.qr_code = qrCode;
    order.qr_code_hash = qrCodeHash;
    order.delivery_otp_hash = otpHash;
    order.delivery_otp_expires_at = expiresAt;
    console.log(`[order-qr] Generated QR/OTP for order ${order.order_id}. Dev OTP: ${otp}`);
    return true;
}

/**
 * Load order by id and persist QR/OTP if paid and missing (for payment webhooks / verify).
 */
async function ensureDeliveryCodesForOrderId(orderId) {
    if (!orderId) return;
    const order = await Order.findByPk(orderId);
    if (!shouldGenerateDeliveryCodes(order)) return;
    const { qrCode, qrCodeHash } = generateOrderQR(order.order_id);
    const { otp, otpHash, expiresAt } = generateDeliveryOTP();
    await order.update({
        qr_code: qrCode,
        qr_code_hash: qrCodeHash,
        delivery_otp_hash: otpHash,
        delivery_otp_expires_at: expiresAt
    });
    console.log(`[order-qr] Generated QR/OTP for order ${order.order_id}. Dev OTP: ${otp}`);
}

module.exports = {
    shouldGenerateDeliveryCodes,
    ensureDeliveryCodesOnOrderInstance,
    ensureDeliveryCodesForOrderId
};
