const { QerchaPackage, QerchaParticipant, Product, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const sequelize = require('../config/database');

/**
 * Create Qercha package
 * POST /api/v1/qercha/packages
 */
const createPackage = async (req, res, next) => {
    try {
        const { ox_product_id, total_shares, start_date, expiry_date } = req.body;
        const host_user_id = req.user.user_id;

        if (!ox_product_id || !total_shares || total_shares < 2) {
            return sendError(res, 400, 'Product ID and valid total shares (minimum 2) are required');
        }

        // Verify product exists and is Live
        const product = await Product.findByPk(ox_product_id);
        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        if (product.status !== 'Live') {
            return sendError(res, 400, 'Product must be approved before creating Qercha package');
        }

        const package = await QerchaPackage.create({
            ox_product_id,
            total_shares,
            shares_available: total_shares,
            host_user_id,
            status: 'Active',
            start_date: start_date || null,
            expiry_date: expiry_date || null
        });

        return sendSuccess(res, 201, 'Qercha package created successfully', {
            package_id: package.package_id,
            total_shares: package.total_shares
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Join Qercha package (purchase shares)
 * POST /api/v1/qercha/packages/:id/join
 */
const joinPackage = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const {
            shares_purchased,
            payment_method, // 'chapa', 'telebirr', or 'screenshot'
            shipping_address,
            shipping_full_name,
            shipping_phone,
            shipping_city,
            shipping_region,
            shipping_notes,
            // Payment gateway fields
            email,
            phone_number,
            first_name,
            last_name
        } = req.body;
        const user_id = req.user.user_id;

        if (!shares_purchased || shares_purchased < 1) {
            await transaction.rollback();
            return sendError(res, 400, 'Valid number of shares is required');
        }

        if (!payment_method || !['chapa', 'telebirr', 'screenshot'].includes(payment_method)) {
            await transaction.rollback();
            return sendError(res, 400, 'Valid payment method is required (chapa, telebirr, or screenshot)');
        }

        const package = await QerchaPackage.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                }
            ],
            transaction
        });

        if (!package) {
            await transaction.rollback();
            return sendError(res, 404, 'Qercha package not found');
        }

        if (package.status !== 'Active') {
            await transaction.rollback();
            return sendError(res, 400, 'This package is no longer active');
        }

        if (shares_purchased > package.shares_available) {
            await transaction.rollback();
            return sendError(res, 400, `Only ${package.shares_available} shares available`);
        }

        // Calculate amount based on product price
        const pricePerShare = parseFloat(package.product.price) / package.total_shares;
        const amount_paid = pricePerShare * shares_purchased;

        // Create order for this qercha participation
        const { Order: OrderModel } = require('../models');
        const order = await OrderModel.create({
            buyer_id: user_id,
            total_amount: amount_paid,
            payment_status: 'Pending',
            order_status: 'Placed',
            order_type: 'qercha', // Mark as qercha order
            shipping_address,
            shipping_full_name,
            shipping_phone,
            shipping_city,
            shipping_region,
            shipping_notes: shipping_notes || `Qercha package: ${package.product.name} - ${shares_purchased} share(s)`
        }, { transaction });

        // Create participant record linked to order
        const participant = await QerchaParticipant.create({
            package_id: package.package_id,
            user_id,
            shares_purchased,
            amount_paid,
            is_host: user_id === package.host_user_id,
            order_id: order.order_id,
            payment_status: 'Pending'
        }, { transaction });

        // Update available shares
        package.shares_available -= shares_purchased;

        // If all shares sold, mark as Completed
        if (package.shares_available === 0) {
            package.status = 'Completed';
        }

        await package.save({ transaction });

        // Initialize payment based on method
        let paymentData = null;

        if (payment_method !== 'screenshot') {
            // Initialize payment gateway (Chapa or Telebirr)
            const { Payment } = require('../models');
            const chapaService = require('../services/chapaService');
            const telebirrService = require('../services/telebirrService');

            const callbackBaseUrl = process.env.PAYMENT_CALLBACK_BASE_URL || 'http://localhost:5000/api/v1';
            let paymentResult;
            let tx_ref;

            if (payment_method === 'chapa') {
                if (!email) {
                    await transaction.rollback();
                    return sendError(res, 400, 'Email is required for Chapa payments');
                }

                tx_ref = chapaService.generateTxRef('QRC');
                paymentResult = await chapaService.initializePayment({
                    amount: amount_paid,
                    email,
                    phone_number: phone_number || shipping_phone,
                    first_name: first_name || shipping_full_name || 'Customer',
                    last_name: last_name || '',
                    tx_ref,
                    callback_url: `${callbackBaseUrl}/payments/webhook/chapa`,
                    return_url: `${callbackBaseUrl}/payments/return`
                });
            } else if (payment_method === 'telebirr') {
                if (!phone_number && !shipping_phone) {
                    await transaction.rollback();
                    return sendError(res, 400, 'Phone number is required for Telebirr payments');
                }

                tx_ref = telebirrService.generateTxRef('QRC');
                paymentResult = await telebirrService.initializePayment({
                    amount: amount_paid,
                    phone_number: phone_number || shipping_phone,
                    tx_ref,
                    callback_url: `${callbackBaseUrl}/payments/webhook/telebirr`,
                    return_url: `${callbackBaseUrl}/payments/return`,
                    subject: `Qercha: ${package.product.name} - ${shares_purchased} share(s)`
                });
            }

            if (!paymentResult.success) {
                await transaction.rollback();
                return sendError(res, 400, paymentResult.message || 'Failed to initialize payment');
            }

            // Create payment record
            await Payment.create({
                order_id: order.order_id,
                transaction_ref: tx_ref,
                payment_method,
                gateway_used: payment_method,
                status: 'pending',
                amount: amount_paid,
                email: email || null,
                phone_number: phone_number || shipping_phone || null,
                checkout_url: paymentResult.checkout_url,
                metadata: {
                    initialized_at: new Date().toISOString(),
                    user_id,
                    qercha_package_id: package.package_id,
                    shares_purchased
                }
            }, { transaction });

            paymentData = {
                tx_ref,
                checkout_url: paymentResult.checkout_url,
                payment_method
            };
        }

        await transaction.commit();

        return sendSuccess(res, 201, 'Successfully joined Qercha package', {
            participant_id: participant.participant_id,
            order_id: order.order_id,
            shares_purchased: participant.shares_purchased,
            amount_paid: participant.amount_paid,
            remaining_shares: package.shares_available,
            payment: paymentData
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get available Qercha packages
 * GET /api/v1/qercha/packages
 */
const getPackages = async (req, res, next) => {
    try {
        const packages = await QerchaPackage.findAll({
            where: { status: 'Active' },
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: User,
                    as: 'host',
                    attributes: ['user_id', 'phone', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Qercha packages retrieved successfully', { packages });
    } catch (error) {
        next(error);
    }
};

/**
 * Get package details with participants
 * GET /api/v1/qercha/packages/:id
 */
const getPackageDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const package = await QerchaPackage.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: User,
                    as: 'host',
                    attributes: ['user_id', 'phone', 'email']
                },
                {
                    model: QerchaParticipant,
                    as: 'participants',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'phone']
                        }
                    ]
                }
            ]
        });

        if (!package) {
            return sendError(res, 404, 'Qercha package not found');
        }

        return sendSuccess(res, 200, 'Package details retrieved successfully', { package });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Qercha package status (Admin)
 * PUT /api/v1/qercha/:id/status
 */
const updatePackageStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Active', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return sendError(res, 400, 'Invalid status');
        }

        const package = await QerchaPackage.findByPk(id);
        if (!package) {
            return sendError(res, 404, 'Qercha package not found');
        }

        package.status = status;
        await package.save();

        return sendSuccess(res, 200, 'Package status updated', {
            package_id: package.package_id,
            status: package.status
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPackage,
    joinPackage,
    getPackages,
    getPackageDetails,
    updatePackageStatus
};
