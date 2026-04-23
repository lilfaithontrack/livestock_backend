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

/**
 * Generate QR/OTP for ALL orders in an order group.
 * Called after group payment is confirmed.
 */
async function ensureDeliveryCodesForGroup(groupId) {
    if (!groupId) return;
    const orders = await Order.findAll({ where: { group_id: groupId } });
    for (const order of orders) {
        if (!shouldGenerateDeliveryCodes(order)) continue;
        const { qrCode, qrCodeHash } = generateOrderQR(order.order_id);
        const { otp, otpHash, expiresAt } = generateDeliveryOTP();
        await order.update({
            qr_code: qrCode,
            qr_code_hash: qrCodeHash,
            delivery_otp_hash: otpHash,
            delivery_otp_expires_at: expiresAt
        });
        console.log(`[order-qr] Generated QR/OTP for group order ${order.order_id}. Dev OTP: ${otp}`);
    }
}

/**
 * Mark all orders in a group as Paid and generate delivery codes.
 */
async function markGroupOrdersPaid(groupId) {
    if (!groupId) return;
    await Order.update(
        { payment_status: 'Paid' },
        { where: { group_id: groupId } }
    );
    await ensureDeliveryCodesForGroup(groupId);
}

/**
 * Mark all orders in a group as Failed.
 */
async function markGroupOrdersFailed(groupId) {
    if (!groupId) return;
    await Order.update(
        { payment_status: 'Failed' },
        { where: { group_id: groupId } }
    );
}

module.exports = {
    shouldGenerateDeliveryCodes,
    ensureDeliveryCodesOnOrderInstance,
    ensureDeliveryCodesForOrderId,
    ensureDeliveryCodesForGroup,
    markGroupOrdersPaid,
    markGroupOrdersFailed
};
