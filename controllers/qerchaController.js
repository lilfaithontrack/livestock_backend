const { QerchaPackage, QerchaParticipant, Product, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const sequelize = require('../config/database');
const { createProductWithQerchaTransaction } = require('../utils/qerchaHelpers');

/**
 * Create Qercha package
 * POST /api/v1/qercha/packages
 */
const createPackage = async (req, res, next) => {
    try {
        const {
            ox_product_id,
            total_shares,
            start_date,
            expiry_date,
            category,
            ethiopian_start_display,
            ethiopian_expiry_display,
            time_window_note,
            location,
            delivery_info
        } = req.body;
        const host_user_id = req.user.user_id;

        const sharesCount = parseFloat(total_shares);
        if (!ox_product_id || !sharesCount || sharesCount < 2) {
            return sendError(res, 400, 'Product ID and valid total shares (minimum 2) are required');
        }

        // Verify product exists and is either Live or Pending
        const product = await Product.findByPk(ox_product_id);
        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        if (product.status !== 'Live' && product.status !== 'Pending') {
            return sendError(res, 400, 'Product must be Live or Pending to create a Qercha package');
        }

        // Only the product's own seller (or an Admin) can attach a Qercha package to it
        if (req.user.role !== 'Admin' && product.seller_id !== host_user_id) {
            return sendError(res, 403, 'You can only create Qercha packages for your own products');
        }

        const pkg = await QerchaPackage.create({
            ox_product_id,
            total_shares: sharesCount,
            shares_available: sharesCount,
            host_user_id,
            status: 'Active',
            moderation_status: req.user.role === 'Admin' ? 'approved' : 'pending',
            admin_approved_by: req.user.role === 'Admin' ? host_user_id : null,
            approved_at: req.user.role === 'Admin' ? new Date() : null,
            start_date: start_date || null,
            expiry_date: expiry_date || null,
            category: category || null,
            ethiopian_start_display: ethiopian_start_display || null,
            ethiopian_expiry_display: ethiopian_expiry_display || null,
            time_window_note: time_window_note || null,
            location: location || null,
            delivery_info: delivery_info || null
        });

        return sendSuccess(res, 201, 'Qercha package created successfully', {
            package_id: pkg.package_id,
            total_shares: pkg.total_shares,
            moderation_status: pkg.moderation_status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create product + Qercha package together (Seller only)
 * POST /api/v1/qercha/seller/products-with-package
 * Mirrors the admin's atomic "create product + qercha" flow, scoped to the authenticated seller.
 * The resulting product and package go through normal moderation (Pending / pending),
 * they are NOT auto-approved like the admin endpoint.
 */
const createSellerProductWithQercha = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const seller_id = req.user.user_id;

        const seller = await User.findByPk(seller_id, { transaction });
        if (!seller) {
            await transaction.rollback();
            return sendError(res, 404, 'Seller not found');
        }
        if (!seller.kyc_status) {
            await transaction.rollback();
            return sendError(res, 403, 'KYC verification required. Please complete KYC to upload products.');
        }

        const { product, qerchaPackage } = await createProductWithQerchaTransaction({
            body: req.body,
            files: req.files,
            seller_id,
            host_user_id: seller_id,
            productStatus: 'Pending', // Seller-created products require admin approval
            autoApproveQercha: false, // Seller-created qercha packages require admin approval
            transaction
        });

        await transaction.commit();

        const response = {
            product_id: product.product_id,
            sku: product.sku,
            status: product.status
        };

        if (qerchaPackage) {
            response.qercha_package = {
                package_id: qerchaPackage.package_id,
                total_shares: qerchaPackage.total_shares,
                moderation_status: qerchaPackage.moderation_status
            };
        }

        return sendSuccess(res, 201,
            qerchaPackage
                ? 'Product and Qercha package submitted for admin approval'
                : 'Product submitted for admin approval',
            response
        );
    } catch (error) {
        await transaction.rollback();
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
        const sharesRequested = parseFloat(shares_purchased);

        if (!sharesRequested || sharesRequested < 0.25) {
            await transaction.rollback();
            return sendError(res, 400, 'Valid number of shares is required (minimum 0.25)');
        }

        if (!payment_method || !['chapa', 'telebirr', 'screenshot'].includes(payment_method)) {
            await transaction.rollback();
            return sendError(res, 400, 'Valid payment method is required (chapa, telebirr, or screenshot)');
        }

        const pkg = await QerchaPackage.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                }
            ],
            transaction
        });

        if (!pkg) {
            await transaction.rollback();
            return sendError(res, 404, 'Qercha package not found');
        }

        if (pkg.status !== 'Active') {
            await transaction.rollback();
            return sendError(res, 400, 'This package is no longer active');
        }

        if (pkg.moderation_status !== 'approved') {
            await transaction.rollback();
            return sendError(res, 400, 'This package is awaiting admin approval');
        }

        if (sharesRequested > parseFloat(pkg.shares_available)) {
            await transaction.rollback();
            return sendError(res, 400, `Only ${pkg.shares_available} shares available`);
        }

        // Calculate amount based on product price
        const pricePerShare = parseFloat(pkg.product.price) / parseFloat(pkg.total_shares);
        const amount_paid = pricePerShare * sharesRequested;

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
            shipping_notes: shipping_notes || `Qercha package: ${pkg.product.name} - ${sharesRequested} share(s)`
        }, { transaction });

        // Create participant record linked to order
        const participant = await QerchaParticipant.create({
            package_id: pkg.package_id,
            user_id,
            shares_purchased: sharesRequested,
            amount_paid,
            is_host: user_id === pkg.host_user_id,
            order_id: order.order_id,
            payment_status: 'Pending'
        }, { transaction });

        // Update available shares
        pkg.shares_available = parseFloat(pkg.shares_available) - sharesRequested;

        // If all shares sold, mark as Completed
        if (pkg.shares_available <= 0) {
            pkg.shares_available = 0;
            pkg.status = 'Completed';
        }

        await pkg.save({ transaction });

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
                    subject: `Qercha: ${pkg.product.name} - ${sharesRequested} share(s)`
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
                    qercha_package_id: pkg.package_id,
                    shares_purchased: sharesRequested
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
            remaining_shares: pkg.shares_available,
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
        const { category } = req.query;
        // Public listing: only Active AND admin-approved packages are shown to buyers
        const where = { status: 'Active', moderation_status: 'approved' };
        if (category) where.category = category;

        const packages = await QerchaPackage.findAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    where: { status: 'Live' }
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
 * Get all Qercha packages regardless of moderation/lifecycle status (Admin)
 * GET /api/v1/qercha/
 */
const adminGetPackages = async (req, res, next) => {
    try {
        const { category, status, moderation_status } = req.query;
        const where = {};
        if (category) where.category = category;
        if (status) where.status = status;
        if (moderation_status) where.moderation_status = moderation_status;

        const packages = await QerchaPackage.findAll({
            where,
            include: [
                { model: Product, as: 'product' },
                { model: User, as: 'host', attributes: ['user_id', 'phone', 'email'] },
                { model: QerchaParticipant, as: 'participants' }
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

        const pkg = await QerchaPackage.findByPk(id, {
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

        if (!pkg) {
            return sendError(res, 404, 'Qercha package not found');
        }

        return sendSuccess(res, 200, 'Package details retrieved successfully', { package: pkg });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Qercha package status (Admin)
 * PUT /api/v1/qercha/:id/status
 */
/**
 * Host seller updates own package (schedule / labels — not share inflation past sold)
 * PUT /api/v1/qercha/packages/:id
 */
const updateSellerPackage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.user_id;
        const {
            total_shares,
            start_date,
            expiry_date,
            category,
            ethiopian_start_display,
            ethiopian_expiry_display,
            time_window_note,
            location,
            delivery_info
        } = req.body;

        const pkg = await QerchaPackage.findByPk(id);
        if (!pkg) {
            return sendError(res, 404, 'Qercha package not found');
        }
        if (pkg.host_user_id !== user_id && req.user.role !== 'Admin') {
            return sendError(res, 403, 'Only the package host can update this package');
        }

        const sold = parseFloat(pkg.total_shares) - parseFloat(pkg.shares_available);
        const updates = {};
        if (category !== undefined) updates.category = category;
        if (start_date !== undefined) updates.start_date = start_date || null;
        if (expiry_date !== undefined) updates.expiry_date = expiry_date || null;
        if (ethiopian_start_display !== undefined) updates.ethiopian_start_display = ethiopian_start_display || null;
        if (ethiopian_expiry_display !== undefined) updates.ethiopian_expiry_display = ethiopian_expiry_display || null;
        if (time_window_note !== undefined) updates.time_window_note = time_window_note || null;
        if (location !== undefined) updates.location = location || null;
        if (delivery_info !== undefined) updates.delivery_info = delivery_info || null;

        if (total_shares !== undefined) {
            const nextTotal = parseFloat(total_shares);
            if (Number.isNaN(nextTotal) || nextTotal < 2) {
                return sendError(res, 400, 'total_shares must be at least 2');
            }
            if (nextTotal < sold) {
                return sendError(res, 400, `total_shares cannot be less than shares already sold (${sold})`);
            }
            updates.total_shares = nextTotal;
            updates.shares_available = nextTotal - sold;
        }

        // Editing a previously-approved seller package sends it back for re-review,
        // mirroring the Rental pattern of resetting status on significant changes.
        if (req.user.role !== 'Admin' && pkg.moderation_status === 'approved' && Object.keys(updates).length > 0) {
            updates.moderation_status = 'pending';
            updates.admin_approved_by = null;
            updates.approved_at = null;
            updates.rejection_reason = null;
        }

        await pkg.update(updates);

        return sendSuccess(res, 200, 'Qercha package updated', { package: pkg });
    } catch (error) {
        next(error);
    }
};

const updatePackageStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Active', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return sendError(res, 400, 'Invalid status');
        }

        const pkg = await QerchaPackage.findByPk(id);
        if (!pkg) {
            return sendError(res, 404, 'Qercha package not found');
        }

        pkg.status = status;
        await pkg.save();

        return sendSuccess(res, 200, 'Package status updated', {
            package_id: pkg.package_id,
            status: pkg.status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve a pending Qercha package (Admin)
 * PUT /api/v1/qercha/admin/:id/approve
 */
const approvePackage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;

        const pkg = await QerchaPackage.findByPk(id);
        if (!pkg) {
            return sendError(res, 404, 'Qercha package not found');
        }

        await pkg.update({
            moderation_status: 'approved',
            admin_approved_by: admin_id,
            approved_at: new Date(),
            rejection_reason: null
        });

        return sendSuccess(res, 200, 'Qercha package approved successfully', { package: pkg });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject a pending Qercha package (Admin)
 * PUT /api/v1/qercha/admin/:id/reject
 */
const rejectPackage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;

        const pkg = await QerchaPackage.findByPk(id);
        if (!pkg) {
            return sendError(res, 404, 'Qercha package not found');
        }

        await pkg.update({
            moderation_status: 'rejected',
            rejection_reason: rejection_reason || 'Rejected by admin'
        });

        return sendSuccess(res, 200, 'Qercha package rejected', { package: pkg });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPackage,
    createSellerProductWithQercha,
    adminGetPackages,
    approvePackage,
    rejectPackage,
    joinPackage,
    getPackages,
    getPackageDetails,
    updateSellerPackage,
    updatePackageStatus
};
