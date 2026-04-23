const {
    Order, OrderItem, Product, User, QerchaPackage, QerchaParticipant, Delivery, OrderGroup
} = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const sequelize = require('../config/database');
const {
    checkStockAvailability,
    reserveStock,
    deductStock
} = require('../utils/stockHelpers');
const { compressImage } = require('../middleware/uploadMiddleware');
const { ensureDeliveryCodesOnOrderInstance } = require('../utils/orderDeliveryVerification');

/**
 * Create order (checkout)
 * POST /api/v1/orders/checkout
 * Supports mixed items: Standard Products and Qercha Packages
 * Splits items by seller — creates an OrderGroup + one Order per seller.
 */
const createOrder = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            items, // items: [{ product_id, quantity, type: 'product'|'qercha', package_id }]
            shipping_address,
            shipping_full_name,
            shipping_phone,
            shipping_city,
            shipping_region,
            shipping_notes
        } = req.body;

        console.log('[OrderController] Create Order Head:', { items, buyer_id: req.user.user_id });
        console.log('[OrderController] Full Body:', JSON.stringify(req.body, null, 2));

        const buyer_id = req.user.user_id;

        if (!items || items.length === 0) {
            await transaction.rollback();
            return sendError(res, 400, 'Order must contain at least one item');
        }

        let grandTotal = 0;
        // Collect validated items grouped by seller_id
        // Key: seller_id, Value: { orderItems: [], qerchaParticipants: [], qerchaPackageUpdates: [], subtotal: 0 }
        const sellerBuckets = {};
        let hasQercha = false;

        const ensureBucket = (sellerId) => {
            if (!sellerBuckets[sellerId]) {
                sellerBuckets[sellerId] = {
                    orderItems: [],
                    qerchaParticipants: [],
                    qerchaPackageUpdates: [],
                    subtotal: 0
                };
            }
        };

        // Validate stock and calculate totals
        for (const item of items) {
            const itemType = item.type || 'product';

            if (itemType === 'qercha') {
                hasQercha = true;
                if (!item.package_id) {
                    await transaction.rollback();
                    return sendError(res, 400, 'Package ID is required for Qercha items');
                }

                const qerchaPackage = await QerchaPackage.findByPk(item.package_id, {
                    include: [{ model: Product, as: 'product' }],
                    transaction
                });

                if (!qerchaPackage) {
                    await transaction.rollback();
                    return sendError(res, 404, `Qercha package ${item.package_id} not found`);
                }

                if (qerchaPackage.status !== 'Active') {
                    await transaction.rollback();
                    return sendError(res, 400, `Qercha package is not active`);
                }

                if (qerchaPackage.shares_available < item.quantity) {
                    await transaction.rollback();
                    return sendError(res, 400, `Not enough shares available for package. Available: ${qerchaPackage.shares_available}`);
                }

                const pricePerShare = parseFloat(qerchaPackage.product.price) / qerchaPackage.total_shares;
                const itemTotal = pricePerShare * item.quantity;
                grandTotal += itemTotal;

                const sellerId = qerchaPackage.product.seller_id;
                ensureBucket(sellerId);
                sellerBuckets[sellerId].subtotal += itemTotal;

                sellerBuckets[sellerId].orderItems.push({
                    product_id: qerchaPackage.product.product_id,
                    quantity: item.quantity,
                    unit_price: pricePerShare,
                    seller_id: sellerId
                });

                sellerBuckets[sellerId].qerchaParticipants.push({
                    user_id: buyer_id,
                    package_id: qerchaPackage.package_id,
                    shares_bought: item.quantity,
                    amount_paid: itemTotal,
                    payment_status: 'Pending',
                    joined_at: new Date()
                });

                sellerBuckets[sellerId].qerchaPackageUpdates.push({
                    package: qerchaPackage,
                    shares_deducted: item.quantity
                });

            } else {
                const product = await Product.findByPk(item.product_id, { transaction });

                if (!product) {
                    await transaction.rollback();
                    return sendError(res, 404, `Product ${item.product_id} not found`);
                }

                if (product.status !== 'Live') {
                    await transaction.rollback();
                    return sendError(res, 400, `Product ${product.name} is not available`);
                }

                const stockCheck = await checkStockAvailability(item.product_id, item.quantity);
                if (!stockCheck.available) {
                    await transaction.rollback();
                    return sendError(res, 400, `${product.name}: ${stockCheck.message}`);
                }

                const itemTotal = parseFloat(product.price) * item.quantity;
                grandTotal += itemTotal;

                const sellerId = product.seller_id;
                ensureBucket(sellerId);
                sellerBuckets[sellerId].subtotal += itemTotal;

                sellerBuckets[sellerId].orderItems.push({
                    product_id: product.product_id,
                    quantity: item.quantity,
                    unit_price: product.price,
                    seller_id: product.seller_id
                });

                if (product.enable_stock_management) {
                    await reserveStock(
                        product.product_id,
                        item.quantity,
                        null,
                        buyer_id,
                        transaction
                    );
                }
            }
        }

        // --- Create OrderGroup ---
        const orderGroup = await OrderGroup.create({
            buyer_id,
            total_amount: grandTotal,
            payment_status: 'Pending',
            shipping_address,
            shipping_full_name,
            shipping_phone,
            shipping_city,
            shipping_region,
            shipping_notes,
            order_type: hasQercha ? 'qercha' : 'regular'
        }, { transaction });

        // --- Create one Order per seller ---
        const createdOrders = [];

        for (const [sellerId, bucket] of Object.entries(sellerBuckets)) {
            const order = await Order.create({
                group_id: orderGroup.group_id,
                seller_id: sellerId,
                buyer_id,
                total_amount: bucket.subtotal,
                payment_status: 'Pending',
                order_status: 'Placed',
                shipping_address,
                shipping_full_name,
                shipping_phone,
                shipping_city,
                shipping_region,
                shipping_notes,
                order_type: bucket.qerchaParticipants.length > 0 ? 'qercha' : 'regular'
            }, { transaction });

            // Create order items for this seller's order
            for (const oi of bucket.orderItems) {
                await OrderItem.create({
                    order_id: order.order_id,
                    ...oi
                }, { transaction });
            }

            // Create Qercha Participants for this seller's order
            for (const participant of bucket.qerchaParticipants) {
                await QerchaParticipant.create({
                    ...participant,
                    order_id: order.order_id
                }, { transaction });
            }

            // Update Qercha Package Shares
            for (const update of bucket.qerchaPackageUpdates) {
                const pkg = update.package;
                const newSharesAvailable = pkg.shares_available - update.shares_deducted;
                let newStatus = pkg.status;
                if (newSharesAvailable === 0) {
                    newStatus = 'Completed';
                }
                await pkg.update({
                    shares_available: newSharesAvailable,
                    status: newStatus
                }, { transaction });
            }

            createdOrders.push({
                order_id: order.order_id,
                seller_id: sellerId,
                subtotal: bucket.subtotal,
                item_count: bucket.orderItems.length
            });
        }

        await transaction.commit();

        console.log(`[OrderController] Group ${orderGroup.group_id} created with ${createdOrders.length} seller order(s)`);

        return sendSuccess(res, 201, 'Order created successfully', {
            group_id: orderGroup.group_id,
            orders: createdOrders,
            total_amount: grandTotal,
            order_count: createdOrders.length
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get user's orders
 * GET /api/v1/orders
 */
const getOrders = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;

        const orders = await Order.findAll({
            where: { buyer_id: user_id },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product'
                        }
                    ]
                },
                {
                    model: User,
                    as: 'order_seller',
                    attributes: ['user_id', 'email', 'phone', 'address']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Orders retrieved successfully', { orders });
    } catch (error) {
        next(error);
    }
};

/**
 * Get order by ID
 * GET /api/v1/orders/:id
 */
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const order = await Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product'
                        },
                        {
                            model: User,
                            as: 'seller',
                            attributes: ['user_id', 'email', 'phone', 'address']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'email', 'phone', 'address']
                },
                {
                    model: User,
                    as: 'order_seller',
                    attributes: ['user_id', 'email', 'phone', 'address']
                },
                {
                    model: Delivery,
                    as: 'delivery',
                    attributes: ['delivery_id', 'status', 'agent_id', 'seller_delivery_agent_id', 'assignment_type', 'pickup_location', 'delivery_location', 'pickup_confirmed_at', 'delivery_confirmed_at']
                }
            ]
        });

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        return sendSuccess(res, 200, 'Order retrieved successfully', { order });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all orders in an order group
 * GET /api/v1/orders/group/:groupId
 */
const getOrdersByGroup = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const user_id = req.user.user_id;

        const orderGroup = await OrderGroup.findByPk(groupId);
        if (!orderGroup) {
            return sendError(res, 404, 'Order group not found');
        }

        // Only the buyer or admin can view group
        if (orderGroup.buyer_id !== user_id && req.user.role !== 'Admin') {
            return sendError(res, 403, 'Unauthorized to view this order group');
        }

        const orders = await Order.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                },
                {
                    model: User,
                    as: 'order_seller',
                    attributes: ['user_id', 'email', 'phone', 'address']
                },
                {
                    model: Delivery,
                    as: 'delivery',
                    attributes: ['delivery_id', 'status', 'agent_id', 'seller_delivery_agent_id', 'assignment_type']
                }
            ],
            order: [['created_at', 'ASC']]
        });

        return sendSuccess(res, 200, 'Order group retrieved successfully', {
            group_id: orderGroup.group_id,
            total_amount: orderGroup.total_amount,
            payment_status: orderGroup.payment_status,
            shipping_address: orderGroup.shipping_address,
            orders
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update order status
 * PUT /api/v1/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { order_status, payment_status } = req.body;

        const order = await Order.findByPk(id, {
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{ model: Product, as: 'product' }]
            }],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            return sendError(res, 404, 'Order not found');
        }

        const previousPaymentStatus = order.payment_status;
        const previousOrderStatus = order.order_status;

        // Update statuses
        if (order_status) order.order_status = order_status;
        if (payment_status) order.payment_status = payment_status;

        // Handle payment confirmation
        if (payment_status === 'Paid' && previousPaymentStatus !== 'Paid') {
            // 1. Deduct stock for STANDARD products
            for (const item of order.items) {
                // We don't have 'type' on OrderItem easily available unless we store it or infer it.
                // However, for Qercha items, the product linked is the Ox. The Ox has 'enable_stock_management' usually false or handled differently?
                // Actually, for Qercha, we managed shares in createOrder. We don't want to deduct stock from the parent Ox product again unless that's how it works.
                // Qercha usually has a specific ProductType.
                // To be safe: checks if simple stock management is enabled.
                if (item.product.enable_stock_management) {
                    await deductStock(
                        item.product_id,
                        item.quantity,
                        order.order_id,
                        req.user ? req.user.user_id : null,
                        transaction
                    );
                }
            }

            // 2. Update Qercha Participant Status
            // We need to find participants linked to this order
            const participants = await QerchaParticipant.findAll({
                where: { order_id: order.order_id },
                transaction
            });

            for (const p of participants) {
                p.payment_status = 'Paid';
                await p.save({ transaction });
            }

            // 3. Create Seller Earnings — each order is now per-seller
            const earningsController = require('./earningsController');

            if (order.seller_id) {
                // New split-order: seller_id is on the order itself
                try {
                    await earningsController.createEarning(
                        order.order_id,
                        order.seller_id,
                        parseFloat(order.total_amount),
                        transaction
                    );
                } catch (err) {
                    console.error('Failed to create earning for seller:', order.seller_id, err);
                }
            } else {
                // Legacy order (no seller_id on order): group by seller from items
                const sellerTotals = {};

                if (order.items && order.items.length > 0) {
                    for (const item of order.items) {
                        if (item.seller_id) {
                            const itemTotal = parseFloat(item.unit_price) * parseInt(item.quantity);
                            sellerTotals[item.seller_id] = (sellerTotals[item.seller_id] || 0) + itemTotal;
                        }
                    }
                }

                if (participants && participants.length > 0) {
                    for (const p of participants) {
                        const pkg = await QerchaPackage.findByPk(p.package_id, { transaction });
                        if (pkg && pkg.host_user_id) {
                            const amount = parseFloat(p.amount_paid);
                            sellerTotals[pkg.host_user_id] = (sellerTotals[pkg.host_user_id] || 0) + amount;
                        }
                    }
                }

                for (const sellerId in sellerTotals) {
                    try {
                        await earningsController.createEarning(order.order_id, sellerId, sellerTotals[sellerId], transaction);
                    } catch (err) {
                        console.error('Failed to create earning for seller:', sellerId, err);
                    }
                }
            }

            // Buyer handover QR + OTP for delivery verification once payment is confirmed
            ensureDeliveryCodesOnOrderInstance(order);
        }

        // Handle order cancellation
        if (order_status === 'Cancelled' && previousOrderStatus !== 'Cancelled') {
            const { releaseReservedStock } = require('../utils/stockHelpers');

            // 1. Handle Standard Products
            for (const item of order.items) {
                if (item.product.enable_stock_management) {
                    // If payment was not completed, release reservation
                    if (order.payment_status !== 'Paid') {
                        await releaseReservedStock(
                            item.product_id,
                            item.quantity,
                            order.order_id,
                            req.user ? req.user.user_id : null,
                            transaction
                        );
                    } else {
                        // If paid and cancelled, add stock back (return)
                        const { addStock } = require('../utils/stockHelpers');
                        const notificationService = require('../services/notificationService');
                        await addStock(
                            item.product_id,
                            item.quantity,
                            `Order ${order.order_id} cancelled - refund`,
                            req.user ? req.user.user_id : null,
                            transaction
                        );
                    }
                }
            }

            // 2. Handle Qercha Reversal
            const participants = await QerchaParticipant.findAll({
                where: { order_id: order.order_id },
                include: [{ model: QerchaPackage, as: 'package' }],
                transaction
            });

            for (const p of participants) {
                // Refund logic would go here (e.g., wallet credit)
                p.payment_status = 'Refunded'; // Or Cancelled
                await p.save({ transaction });

                // Return shares to package
                const pkg = p.package;
                if (pkg) {
                    pkg.shares_available += p.shares_bought;
                    if (pkg.status === 'Completed' || pkg.status === 'Closed') {
                        pkg.status = 'Active'; // Re-open if it was full
                    }
                    await pkg.save({ transaction });
                }
            }
        }

        await order.save({ transaction });
        await transaction.commit();

        return sendSuccess(res, 200, 'Order status updated successfully', {
            order_id: order.order_id,
            order_status: order.order_status,
            payment_status: order.payment_status
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Upload payment proof (screenshot) — supports single order or order group
 * POST /api/v1/orders/:id/payment-proof
 */
const uploadPaymentProof = async (req, res, next) => {
    try {
        const { id } = req.params;
        const buyer_id = req.user.user_id;

        const order = await Order.findByPk(id);

        if (!order) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.buyer_id !== buyer_id) {
            return sendError(res, 403, 'You can only upload payment proof for your own orders');
        }

        if (order.payment_proof_url) {
            return sendError(res, 400, 'Payment proof already uploaded. Contact support to update.');
        }

        if (!req.file) {
            return sendError(res, 400, 'Payment proof image is required');
        }

        const compressedImageUrl = await compressImage(req.file.path, {
            width: 1200,
            height: 1200,
            quality: 85
        });

        order.payment_proof_url = compressedImageUrl;
        order.payment_status = 'Pending';
        await order.save();

        return sendSuccess(res, 200, 'Payment proof uploaded successfully', {
            order_id: order.order_id,
            payment_proof_url: order.payment_proof_url,
            payment_status: order.payment_status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload payment proof for an entire order group
 * POST /api/v1/orders/group/:groupId/payment-proof
 */
const uploadGroupPaymentProof = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const buyer_id = req.user.user_id;

        const orderGroup = await OrderGroup.findByPk(groupId);
        if (!orderGroup) {
            return sendError(res, 404, 'Order group not found');
        }

        if (orderGroup.buyer_id !== buyer_id) {
            return sendError(res, 403, 'You can only upload payment proof for your own orders');
        }

        if (orderGroup.payment_proof_url) {
            return sendError(res, 400, 'Payment proof already uploaded. Contact support to update.');
        }

        if (!req.file) {
            return sendError(res, 400, 'Payment proof image is required');
        }

        const compressedImageUrl = await compressImage(req.file.path, {
            width: 1200,
            height: 1200,
            quality: 85
        });

        // Update group
        orderGroup.payment_proof_url = compressedImageUrl;
        await orderGroup.save();

        // Also store on all sub-orders for backward compat
        await Order.update(
            { payment_proof_url: compressedImageUrl },
            { where: { group_id: groupId } }
        );

        return sendSuccess(res, 200, 'Payment proof uploaded for order group', {
            group_id: orderGroup.group_id,
            payment_proof_url: compressedImageUrl,
            payment_status: orderGroup.payment_status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get seller's orders (orders containing seller's products)
 * GET /api/v1/orders/seller
 */
const getSellerOrders = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;

        // New split orders have seller_id on Order; legacy orders need item-based filter
        const { Op } = require('sequelize');

        const orders = await Order.findAll({
            where: {
                [Op.or]: [
                    { seller_id },
                    { '$items.seller_id$': seller_id }
                ]
            },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product'
                        }
                    ]
                },
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'email', 'phone', 'address']
                },
                {
                    model: Delivery,
                    as: 'delivery',
                    attributes: ['delivery_id', 'status', 'agent_id', 'seller_delivery_agent_id', 'assignment_type']
                }
            ],
            order: [['created_at', 'DESC']],
            subQuery: false
        });

        return sendSuccess(res, 200, 'Seller orders retrieved successfully', { orders });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getOrders,
    getSellerOrders,
    getOrderById,
    getOrdersByGroup,
    updateOrderStatus,
    uploadPaymentProof,
    uploadGroupPaymentProof
};
