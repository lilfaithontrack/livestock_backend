const { Product, StockMovement } = require('../models');
const sequelize = require('../config/database');

/**
 * Check if sufficient stock is available for purchase
 * @param {string} productId - Product UUID
 * @param {number} quantity - Requested quantity
 * @returns {Promise<{available: boolean, product: object, message: string}>}
 */
const checkStockAvailability = async (productId, quantity) => {
    const product = await Product.findByPk(productId);

    if (!product) {
        return { available: false, product: null, message: 'Product not found' };
    }

    // If stock management is disabled, always allow
    if (!product.enable_stock_management) {
        return { available: true, product, message: 'Stock management disabled for this product' };
    }

    // Check minimum order quantity
    if (quantity < product.minimum_order_quantity) {
        return {
            available: false,
            product,
            message: `Minimum order quantity is ${product.minimum_order_quantity}`
        };
    }

    // Calculate available stock (total - reserved)
    const availableStock = product.stock_quantity - product.reserved_stock;

    // Check if enough stock available
    if (availableStock < quantity) {
        // Allow if backorders are enabled
        if (product.allow_backorders) {
            return {
                available: true,
                product,
                message: 'Backorder will be created',
                isBackorder: true
            };
        }

        return {
            available: false,
            product,
            message: `Only ${availableStock} units available (${product.reserved_stock} reserved)`
        };
    }

    return { available: true, product, message: 'Stock available' };
};

/**
 * Reserve stock for a pending order
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to reserve
 * @param {string} orderId - Order UUID
 * @param {string} userId - User performing the action
 * @returns {Promise<object>} Stock movement record
 */
const reserveStock = async (productId, quantity, orderId, userId, transaction = null) => {
    const product = await Product.findByPk(productId, { transaction });

    if (!product || !product.enable_stock_management) {
        return null; // Skip if product doesn't exist or stock mgmt disabled
    }

    const previousReserved = product.reserved_stock;
    const newReserved = previousReserved + quantity;

    // Update reserved stock
    await product.update(
        { reserved_stock: newReserved },
        { transaction }
    );

    // Log the movement
    const movement = await StockMovement.create({
        product_id: productId,
        movement_type: 'reservation',
        quantity: quantity,
        previous_quantity: product.stock_quantity,
        new_quantity: product.stock_quantity, // Actual stock unchanged
        reference_id: orderId,
        reference_type: 'order',
        notes: `Reserved ${quantity} units for order`,
        performed_by: userId
    }, { transaction });

    return movement;
};

/**
 * Release reserved stock (e.g., when order is cancelled)
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to release
 * @param {string} orderId - Order UUID
 * @param {string} userId - User performing the action
 * @returns {Promise<object>} Stock movement record
 */
const releaseReservedStock = async (productId, quantity, orderId, userId, transaction = null) => {
    const product = await Product.findByPk(productId, { transaction });

    if (!product || !product.enable_stock_management) {
        return null;
    }

    const previousReserved = product.reserved_stock;
    const newReserved = Math.max(0, previousReserved - quantity); // Prevent negative

    // Update reserved stock
    await product.update(
        { reserved_stock: newReserved },
        { transaction }
    );

    // Log the movement
    const movement = await StockMovement.create({
        product_id: productId,
        movement_type: 'reservation_release',
        quantity: -quantity,
        previous_quantity: product.stock_quantity,
        new_quantity: product.stock_quantity, // Actual stock unchanged
        reference_id: orderId,
        reference_type: 'order',
        notes: `Released ${quantity} reserved units (order cancelled)`,
        performed_by: userId
    }, { transaction });

    return movement;
};

/**
 * Deduct stock when order is completed
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to deduct
 * @param {string} orderId - Order UUID
 * @param {string} userId - User performing the action
 * @returns {Promise<object>} Stock movement record
 */
const deductStock = async (productId, quantity, orderId, userId, transaction = null) => {
    const product = await Product.findByPk(productId, { transaction });

    if (!product || !product.enable_stock_management) {
        return null;
    }

    const previousQuantity = product.stock_quantity;
    const newQuantity = Math.max(0, previousQuantity - quantity); // Prevent negative
    const previousReserved = product.reserved_stock;
    const newReserved = Math.max(0, previousReserved - quantity); // Release reservation

    // Update stock and reserved stock
    await product.update({
        stock_quantity: newQuantity,
        reserved_stock: newReserved
    }, { transaction });

    // Update availability status if stock is 0
    await updateAvailabilityStatus(product, transaction);

    // Log the movement
    const movement = await StockMovement.create({
        product_id: productId,
        movement_type: 'sale',
        quantity: -quantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_id: orderId,
        reference_type: 'order',
        notes: `Stock deducted for completed order`,
        performed_by: userId
    }, { transaction });

    return movement;
};

/**
 * Add stock (restock)
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to add
 * @param {string} reason - Reason for restock
 * @param {string} userId - User performing the action
 * @returns {Promise<object>} Stock movement record
 */
const addStock = async (productId, quantity, reason, userId, transaction = null) => {
    const product = await Product.findByPk(productId, { transaction });

    if (!product) {
        throw new Error('Product not found');
    }

    const previousQuantity = product.stock_quantity;
    const newQuantity = previousQuantity + quantity;

    // Update stock
    await product.update(
        { stock_quantity: newQuantity },
        { transaction }
    );

    // Update availability status
    await updateAvailabilityStatus(product, transaction);

    // Log the movement
    const movement = await StockMovement.create({
        product_id: productId,
        movement_type: 'restock',
        quantity: quantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_type: 'manual',
        notes: reason || 'Stock added by user',
        performed_by: userId
    }, { transaction });

    return movement;
};

/**
 * Adjust stock manually (admin)
 * @param {string} productId - Product UUID
 * @param {number} newQuantity - New stock quantity
 * @param {string} reason - Reason for adjustment
 * @param {string} userId - Admin user ID
 * @returns {Promise<object>} Stock movement record
 */
const adjustStock = async (productId, newQuantity, reason, userId, transaction = null) => {
    const product = await Product.findByPk(productId, { transaction });

    if (!product) {
        throw new Error('Product not found');
    }

    const previousQuantity = product.stock_quantity;
    const difference = newQuantity - previousQuantity;

    // Update stock
    await product.update(
        { stock_quantity: newQuantity },
        { transaction }
    );

    // Update availability status
    await updateAvailabilityStatus(product, transaction);

    // Log the movement
    const movement = await StockMovement.create({
        product_id: productId,
        movement_type: 'adjustment',
        quantity: difference,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_type: 'admin_adjustment',
        notes: reason || 'Stock adjusted by admin',
        performed_by: userId
    }, { transaction });

    return movement;
};

/**
 * Update product availability status based on stock
 * @param {object} product - Product instance
 */
const updateAvailabilityStatus = async (product, transaction = null) => {
    let newStatus = product.availability_status;

    if (product.enable_stock_management) {
        const availableStock = product.stock_quantity - product.reserved_stock;

        if (availableStock <= 0 && !product.allow_backorders) {
            newStatus = 'sold';
        } else if (product.availability_status === 'sold' && availableStock > 0) {
            newStatus = 'available';
        }
    }

    if (newStatus !== product.availability_status) {
        await product.update({ availability_status: newStatus }, { transaction });
    }

    return newStatus;
};

/**
 * Get products with low stock for a seller
 * @param {string} sellerId - Seller UUID
 * @returns {Promise<Array>} Products below threshold
 */
const getLowStockProducts = async (sellerId) => {
    const { Op } = require('sequelize');

    const products = await Product.findAll({
        where: {
            seller_id: sellerId,
            enable_stock_management: true,
            [Op.and]: [
                sequelize.where(
                    sequelize.col('stock_quantity'),
                    Op.lte,
                    sequelize.col('low_stock_threshold')
                )
            ]
        },
        attributes: [
            'product_id', 'name', 'sku', 'stock_quantity',
            'low_stock_threshold', 'reserved_stock'
        ],
        order: [['stock_quantity', 'ASC']]
    });

    return products;
};

/**
 * Get stock movement history for a product
 * @param {string} productId - Product UUID
 * @param {object} options - Query options {limit, offset, type}
 * @returns {Promise<object>} Movements and count
 */
const getStockHistory = async (productId, options = {}) => {
    const { limit = 50, offset = 0, type = null } = options;

    const where = { product_id: productId };
    if (type) {
        where.movement_type = type;
    }

    const movements = await StockMovement.findAndCountAll({
        where,
        limit,
        offset,
        include: [
            {
                model: require('../models').User,
                as: 'performer',
                attributes: ['user_id', 'email', 'phone']
            }
        ],
        order: [['created_at', 'DESC']]
    });

    return movements;
};

module.exports = {
    checkStockAvailability,
    reserveStock,
    releaseReservedStock,
    deductStock,
    addStock,
    adjustStock,
    updateAvailabilityStatus,
    getLowStockProducts,
    getStockHistory
};
