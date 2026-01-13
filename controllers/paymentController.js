const { Payment, Order, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const chapaService = require('../services/chapaService');
const telebirrService = require('../services/telebirrService');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

/**
 * Initialize a payment with selected gateway
 * POST /api/v1/payments/initialize
 */
const initializePayment = async (req, res, next) => {
    try {
        const {
            order_id,
            payment_method, // 'chapa' or 'telebirr'
            amount,
            email,
            phone_number,
            first_name,
            last_name,
            return_url
        } = req.body;

        if (!payment_method || !['chapa', 'telebirr'].includes(payment_method)) {
            return sendError(res, 400, 'Valid payment method is required (chapa or telebirr)');
        }

        if (!amount || amount <= 0) {
            return sendError(res, 400, 'Valid amount is required');
        }

        // Validate order if provided
        let order = null;
        if (order_id) {
            order = await Order.findByPk(order_id);
            if (!order) {
                return sendError(res, 404, 'Order not found');
            }
        }

        const callbackBaseUrl = process.env.PAYMENT_CALLBACK_BASE_URL || 'http://localhost:5000/api/v1';
        let paymentResult;
        let tx_ref;

        if (payment_method === 'chapa') {
            if (!email) {
                return sendError(res, 400, 'Email is required for Chapa payments');
            }

            tx_ref = chapaService.generateTxRef('CHP');
            paymentResult = await chapaService.initializePayment({
                amount,
                email,
                phone_number,
                first_name: first_name || req.user?.first_name || 'Customer',
                last_name: last_name || req.user?.last_name || '',
                tx_ref,
                callback_url: `${callbackBaseUrl}/payments/webhook/chapa`,
                return_url: return_url || `${callbackBaseUrl}/payments/return`
            });
        } else if (payment_method === 'telebirr') {
            if (!phone_number) {
                return sendError(res, 400, 'Phone number is required for Telebirr payments');
            }

            tx_ref = telebirrService.generateTxRef('TLB');
            paymentResult = await telebirrService.initializePayment({
                amount,
                phone_number,
                tx_ref,
                callback_url: `${callbackBaseUrl}/payments/webhook/telebirr`,
                return_url: return_url || `${callbackBaseUrl}/payments/return`,
                subject: order_id ? `Order ${order_id}` : 'Ethio Livestock Payment'
            });
        }

        if (!paymentResult.success) {
            return sendError(res, 400, paymentResult.message || 'Failed to initialize payment');
        }

        // Create payment record
        const payment = await Payment.create({
            order_id: order_id || null,
            transaction_ref: tx_ref,
            payment_method,
            gateway_used: payment_method,
            status: 'pending',
            amount,
            email: email || null,
            phone_number: phone_number || null,
            checkout_url: paymentResult.checkout_url,
            metadata: {
                initialized_at: new Date().toISOString(),
                user_id: req.user?.user_id
            }
        });

        // Update order payment status if applicable
        if (order) {
            await order.update({ payment_status: 'Pending' });
        }

        return sendSuccess(res, 200, 'Payment initialized successfully', {
            payment_id: payment.payment_id,
            tx_ref,
            checkout_url: paymentResult.checkout_url,
            payment_method,
            amount
        });
    } catch (error) {
        console.error('Initialize payment error:', error);
        next(error);
    }
};

/**
 * Verify a payment status
 * GET /api/v1/payments/verify/:tx_ref
 */
const verifyPayment = async (req, res, next) => {
    try {
        const { tx_ref } = req.params;

        const payment = await Payment.findOne({
            where: { transaction_ref: tx_ref },
            include: [{
                model: Order,
                as: 'order'
            }]
        });

        if (!payment) {
            return sendError(res, 404, 'Payment not found');
        }

        let verificationResult;

        if (payment.payment_method === 'chapa') {
            verificationResult = await chapaService.verifyPayment(tx_ref);
        } else if (payment.payment_method === 'telebirr') {
            verificationResult = await telebirrService.verifyPayment(tx_ref);
        } else {
            return sendSuccess(res, 200, 'Payment status', {
                payment_id: payment.payment_id,
                status: payment.status,
                payment_method: payment.payment_method
            });
        }

        // Update payment status based on verification
        if (verificationResult.success && verificationResult.status === 'success') {
            await payment.update({
                status: 'success',
                verified_at: new Date(),
                gateway_reference: verificationResult.reference || verificationResult.trade_no,
                metadata: {
                    ...payment.metadata,
                    verification: verificationResult
                }
            });

            // Update order if linked
            if (payment.order_id) {
                await Order.update(
                    { payment_status: 'Paid' },
                    { where: { order_id: payment.order_id } }
                );
            }
        } else if (verificationResult.status === 'failed') {
            await payment.update({
                status: 'failed',
                metadata: {
                    ...payment.metadata,
                    verification: verificationResult
                }
            });

            if (payment.order_id) {
                await Order.update(
                    { payment_status: 'Failed' },
                    { where: { order_id: payment.order_id } }
                );
            }
        }

        return sendSuccess(res, 200, 'Payment verification completed', {
            payment_id: payment.payment_id,
            tx_ref: payment.transaction_ref,
            status: payment.status,
            verified: verificationResult.success,
            verification_status: verificationResult.status
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        next(error);
    }
};

/**
 * Handle Chapa webhook callback
 * POST /api/v1/payments/webhook/chapa
 */
const chapaWebhook = async (req, res) => {
    try {
        console.log('Chapa webhook received:', req.body);

        const { tx_ref, status, reference } = req.body;

        if (!tx_ref) {
            return res.status(400).json({ message: 'Invalid webhook data' });
        }

        const payment = await Payment.findOne({
            where: { transaction_ref: tx_ref }
        });

        if (!payment) {
            console.error('Payment not found for tx_ref:', tx_ref);
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Verify the payment with Chapa
        const verificationResult = await chapaService.verifyPayment(tx_ref);

        if (verificationResult.success && verificationResult.status === 'success') {
            await payment.update({
                status: 'success',
                verified_at: new Date(),
                gateway_reference: reference || verificationResult.reference,
                metadata: {
                    ...payment.metadata,
                    webhook: req.body,
                    verification: verificationResult
                }
            });

            if (payment.order_id) {
                await Order.update(
                    { payment_status: 'Paid' },
                    { where: { order_id: payment.order_id } }
                );
            }
        } else if (verificationResult.status === 'failed' || status === 'failed') {
            await payment.update({
                status: 'failed',
                metadata: {
                    ...payment.metadata,
                    webhook: req.body
                }
            });

            if (payment.order_id) {
                await Order.update(
                    { payment_status: 'Failed' },
                    { where: { order_id: payment.order_id } }
                );
            }
        }

        return res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
        console.error('Chapa webhook error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Handle Telebirr webhook callback
 * POST /api/v1/payments/webhook/telebirr
 */
const telebirrWebhook = async (req, res) => {
    try {
        console.log('Telebirr webhook received:', req.body);

        const result = telebirrService.parseWebhookNotification(req.body);

        if (!result.tx_ref) {
            return res.status(400).json({ message: 'Invalid webhook data' });
        }

        const payment = await Payment.findOne({
            where: { transaction_ref: result.tx_ref }
        });

        if (!payment) {
            console.error('Payment not found for tx_ref:', result.tx_ref);
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (result.success && result.status === 'success') {
            await payment.update({
                status: 'success',
                verified_at: new Date(),
                gateway_reference: result.trade_no,
                metadata: {
                    ...payment.metadata,
                    webhook: req.body
                }
            });

            if (payment.order_id) {
                await Order.update(
                    { payment_status: 'Paid' },
                    { where: { order_id: payment.order_id } }
                );
            }
        } else if (result.status === 'failed') {
            await payment.update({
                status: 'failed',
                metadata: {
                    ...payment.metadata,
                    webhook: req.body
                }
            });

            if (payment.order_id) {
                await Order.update(
                    { payment_status: 'Failed' },
                    { where: { order_id: payment.order_id } }
                );
            }
        }

        return res.status(200).json({ code: 0, msg: 'success' });
    } catch (error) {
        console.error('Telebirr webhook error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get all payments (Admin)
 * GET /api/v1/payments
 */
const getAllPayments = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            payment_method,
            start_date,
            end_date,
            search
        } = req.query;

        const offset = (page - 1) * limit;
        const where = {};

        if (status) {
            where.status = status;
        }

        if (payment_method) {
            where.payment_method = payment_method;
        }

        if (start_date || end_date) {
            where.createdAt = {};
            if (start_date) {
                where.createdAt[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                where.createdAt[Op.lte] = new Date(end_date);
            }
        }

        if (search) {
            where[Op.or] = [
                { transaction_ref: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone_number: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows: payments } = await Payment.findAndCountAll({
            where,
            include: [{
                model: Order,
                as: 'order',
                attributes: ['order_id', 'total_amount', 'order_status', 'payment_status'],
                include: [{
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone']
                }]
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return sendSuccess(res, 200, 'Payments retrieved successfully', {
            payments,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        next(error);
    }
};

/**
 * Get payment by ID
 * GET /api/v1/payments/:id
 */
const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findByPk(id, {
            include: [{
                model: Order,
                as: 'order',
                include: [{
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone']
                }]
            }]
        });

        if (!payment) {
            return sendError(res, 404, 'Payment not found');
        }

        return sendSuccess(res, 200, 'Payment retrieved successfully', { payment });
    } catch (error) {
        console.error('Get payment by ID error:', error);
        next(error);
    }
};

/**
 * Get payment statistics (Admin Dashboard)
 * GET /api/v1/payments/stats
 */
const getPaymentStats = async (req, res, next) => {
    try {
        const { period = '30' } = req.query; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Total stats
        const totalStats = await Payment.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('payment_id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
            ],
            group: ['status']
        });

        // Stats by payment method
        const methodStats = await Payment.findAll({
            attributes: [
                'payment_method',
                [sequelize.fn('COUNT', sequelize.col('payment_id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
            ],
            where: {
                createdAt: { [Op.gte]: startDate }
            },
            group: ['payment_method']
        });

        // Recent period stats
        const recentStats = await Payment.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
                'status',
                [sequelize.fn('COUNT', sequelize.col('payment_id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
            ],
            where: {
                createdAt: { [Op.gte]: startDate }
            },
            group: [sequelize.fn('DATE', sequelize.col('createdAt')), 'status'],
            order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
        });

        // Calculate totals
        const successfulPayments = totalStats.find(s => s.status === 'success');
        const pendingPayments = totalStats.find(s => s.status === 'pending');
        const failedPayments = totalStats.find(s => s.status === 'failed');

        const chapaStats = methodStats.find(m => m.payment_method === 'chapa');
        const telebirrStats = methodStats.find(m => m.payment_method === 'telebirr');
        const screenshotStats = methodStats.find(m => m.payment_method === 'screenshot');

        return sendSuccess(res, 200, 'Payment statistics retrieved', {
            summary: {
                total_revenue: parseFloat(successfulPayments?.dataValues?.total_amount || 0),
                total_successful: parseInt(successfulPayments?.dataValues?.count || 0),
                total_pending: parseInt(pendingPayments?.dataValues?.count || 0),
                total_failed: parseInt(failedPayments?.dataValues?.count || 0),
                pending_amount: parseFloat(pendingPayments?.dataValues?.total_amount || 0)
            },
            by_method: {
                chapa: {
                    count: parseInt(chapaStats?.dataValues?.count || 0),
                    amount: parseFloat(chapaStats?.dataValues?.total_amount || 0)
                },
                telebirr: {
                    count: parseInt(telebirrStats?.dataValues?.count || 0),
                    amount: parseFloat(telebirrStats?.dataValues?.total_amount || 0)
                },
                screenshot: {
                    count: parseInt(screenshotStats?.dataValues?.count || 0),
                    amount: parseFloat(screenshotStats?.dataValues?.total_amount || 0)
                }
            },
            daily_stats: recentStats,
            period_days: parseInt(period)
        });
    } catch (error) {
        console.error('Get payment stats error:', error);
        next(error);
    }
};

/**
 * Update payment status (Admin)
 * PUT /api/v1/payments/:id/status
 */
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            return sendError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const payment = await Payment.findByPk(id);
        if (!payment) {
            return sendError(res, 404, 'Payment not found');
        }

        const updateData = {
            status,
            metadata: {
                ...payment.metadata,
                status_updated_at: new Date().toISOString(),
                status_updated_by: req.user?.user_id
            }
        };

        if (notes) {
            updateData.notes = notes;
        }

        if (status === 'success' && !payment.verified_at) {
            updateData.verified_at = new Date();
        }

        await payment.update(updateData);

        // Update order payment status if linked
        if (payment.order_id) {
            let orderPaymentStatus = 'Pending';
            if (status === 'success') orderPaymentStatus = 'Paid';
            else if (status === 'failed') orderPaymentStatus = 'Failed';
            else if (status === 'refunded') orderPaymentStatus = 'Refunded';

            await Order.update(
                { payment_status: orderPaymentStatus },
                { where: { order_id: payment.order_id } }
            );
        }

        return sendSuccess(res, 200, 'Payment status updated successfully', { payment });
    } catch (error) {
        console.error('Update payment status error:', error);
        next(error);
    }
};

/**
 * Payment return page handler
 * GET /api/v1/payments/return
 */
const paymentReturn = async (req, res) => {
    const { tx_ref, status } = req.query;

    // Redirect to frontend with payment result
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/payment/result?tx_ref=${tx_ref}&status=${status || 'pending'}`);
};

module.exports = {
    initializePayment,
    verifyPayment,
    chapaWebhook,
    telebirrWebhook,
    getAllPayments,
    getPaymentById,
    getPaymentStats,
    updatePaymentStatus,
    paymentReturn
};
