const {
    Order, OrderItem, Product, User, QerchaPackage, QerchaParticipant
} = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const sequelize = require('../config/database');
const {
    checkStockAvailability,
    reserveStock,
    deductStock
} = require('../utils/stockHelpers');
const { compressImage } = require('../middleware/uploadMiddleware');

/**
 * Create order (checkout)
 * POST /api/v1/orders/checkout
 * Supports mixed items: Standard Products and Qercha Packages
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

        let total_amount = 0;
        const orderItemsToCreate = [];
        const qerchaParticipantsToCreate = [];
        const qerchaPackagesToUpdate = [];

        // Validate stock and calculate total
        for (const item of items) {
            const itemType = item.type || 'product'; // Default to product if not specified

            if (itemType === 'qercha') {
                // Handle Qercha Item
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

                // Calculate price per share
                const pricePerShare = parseFloat(qerchaPackage.product.price) / qerchaPackage.total_shares;
                const itemTotal = pricePerShare * item.quantity;
                total_amount += itemTotal;

                // Prepare Order Item (for history)
                orderItemsToCreate.push({
                    product_id: qerchaPackage.product.product_id, // Link to the Ox/Product
                    quantity: item.quantity,
                    unit_price: pricePerShare,
                    seller_id: qerchaPackage.product.seller_id
                });

                // Prepare Qercha Participant
                qerchaParticipantsToCreate.push({
                    user_id: buyer_id,
                    package_id: qerchaPackage.package_id,
                    shares_bought: item.quantity,
                    amount_paid: itemTotal, // Will be marked as paid when order is paid? Or Pending now.
                    payment_status: 'Pending',
                    joined_at: new Date()
                });

                // Prepare Package Update (deduct shares)
                qerchaPackagesToUpdate.push({
                    package: qerchaPackage,
                    shares_deducted: item.quantity
                });

            } else {
                // Handle Standard Product
                const product = await Product.findByPk(item.product_id, { transaction });

                if (!product) {
                    await transaction.rollback();
                    return sendError(res, 404, `Product ${item.product_id} not found`);
                }

                if (product.status !== 'Live') {
                    await transaction.rollback();
                    return sendError(res, 400, `Product ${product.name} is not available`);
                }

                // Check stock availability
                const stockCheck = await checkStockAvailability(item.product_id, item.quantity);
                if (!stockCheck.available) {
                    await transaction.rollback();
                    return sendError(res, 400, `${product.name}: ${stockCheck.message}`);
                }

                const itemTotal = parseFloat(product.price) * item.quantity;
                total_amount += itemTotal;

                orderItemsToCreate.push({
                    product_id: product.product_id,
                    quantity: item.quantity,
                    unit_price: product.price,
                    seller_id: product.seller_id
                });

                // Reserve stock for this item
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

        // Create order
        const order = await Order.create({
            buyer_id,
            total_amount,
            payment_status: 'Pending',
            order_status: 'Placed',
            shipping_address,
            shipping_full_name,
            shipping_phone,
            shipping_city,
            shipping_region,
            shipping_notes
        }, { transaction });

        // Create order items
        for (const item of orderItemsToCreate) {
            await OrderItem.create({
                order_id: order.order_id,
                ...item
            }, { transaction });
        }

        // Create Qercha Participants
        for (const participant of qerchaParticipantsToCreate) {
            await QerchaParticipant.create({
                ...participant,
                order_id: order.order_id
            }, { transaction });
        }

        // Update Qercha Package Shares
        for (const update of qerchaPackagesToUpdate) {
            const pkg = update.package;
            const newSharesAvailable = pkg.shares_available - update.shares_deducted;

            let newStatus = pkg.status;
            if (newSharesAvailable === 0) {
                newStatus = 'Completed'; // Or whatever status means fully funded but not yet slaughtered
            }

            await pkg.update({
                shares_available: newSharesAvailable,
                status: newStatus
            }, { transaction });
        }

        // Update reserved stock with order ID (for standard products)
        // Note: reserveStock was called with null orderId, we might need a way to update it or just rely on the order items. 
        // The stockHelpers.reserveStock creates a StockMovement. Ideally we update that movement with the OrderID now.
        // For simplicity in this refactor, we are skipping the strict linking of the reservation to the order ID in the stock movement if the helper doesn't return the movement ID.
        // A better approach would be to have reserveStock return the ID, but for now we proceed.

        await transaction.commit();

        return sendSuccess(res, 201, 'Order created successfully', {
            order_id: order.order_id,
            total_amount: order.total_amount,
            order_status: order.order_status
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
                            attributes: ['user_id', 'email', 'phone']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'email', 'phone', 'address']
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
 * Upload payment proof (screenshot)
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

        // Ensure buyer owns the order
        if (order.buyer_id !== buyer_id) {
            return sendError(res, 403, 'You can only upload payment proof for your own orders');
        }

        // Check if payment proof already exists
        if (order.payment_proof_url) {
            return sendError(res, 400, 'Payment proof already uploaded. Contact support to update.');
        }

        if (!req.file) {
            return sendError(res, 400, 'Payment proof image is required');
        }

        // Compress and store the image
        const compressedImageUrl = await compressImage(req.file.path, {
            width: 1200,
            height: 1200,
            quality: 85
        });

        // Update order with payment proof URL
        order.payment_proof_url = compressedImageUrl;
        order.payment_status = 'Pending'; // Awaiting verification
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
 * Get seller's orders (orders containing seller's products)
 * GET /api/v1/orders/seller
 */
const getSellerOrders = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;

        // Get all orders that contain items with products from this seller
        const orders = await Order.findAll({
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    where: { seller_id },
                    required: true,
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
                    attributes: ['user_id', 'email', 'phone']
                }
            ],
            order: [['created_at', 'DESC']]
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
    updateOrderStatus,
    uploadPaymentProof
};
