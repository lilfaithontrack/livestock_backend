const { Product, StockMovement } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const {
    addStock,
    adjustStock,
    getLowStockProducts,
    getStockHistory
} = require('../utils/stockHelpers');
const sequelize = require('../config/database');

/**
 * Add stock (restock) - Seller only
 * POST /api/v1/seller/products/:id/restock
 */
const restockProduct = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { quantity, notes } = req.body;
        const seller_id = req.user.user_id;

        if (!quantity || quantity <= 0) {
            await transaction.rollback();
            return sendError(res, 400, 'Quantity must be greater than 0');
        }

        // Verify product belongs to seller
        const product = await Product.findByPk(id, { transaction });

        if (!product) {
            await transaction.rollback();
            return sendError(res, 404, 'Product not found');
        }

        if (product.seller_id !== seller_id) {
            await transaction.rollback();
            return sendError(res, 403, 'You can only restock your own products');
        }

        // Add stock
        const movement = await addStock(
            id,
            parseInt(quantity),
            notes || 'Stock added by seller',
            seller_id,
            transaction
        );

        await transaction.commit();

        return sendSuccess(res, 200, 'Stock added successfully', {
            product_id: id,
            quantity_added: quantity,
            new_stock_quantity: movement.new_quantity,
            movement_id: movement.movement_id
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get stock movement history for a product - Seller only
 * GET /api/v1/seller/products/:id/stock-history
 */
const getProductStockHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20, type } = req.query;
        const seller_id = req.user.user_id;

        // Verify product belongs to seller
        const product = await Product.findByPk(id);

        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        if (product.seller_id !== seller_id) {
            return sendError(res, 403, 'You can only view your own product stock history');
        }

        // Get stock history
        const offset = (page - 1) * limit;
        const history = await getStockHistory(id, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            type
        });

        return sendSuccess(res, 200, 'Stock history retrieved successfully', {
            movements: history.rows,
            pagination: {
                total: history.count,
                page: parseInt(page),
                pages: Math.ceil(history.count / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get low stock products for seller
 * GET /api/v1/seller/products/low-stock
 */
const getLowStock = async (req, res, next) => {
    try {
        const seller_id = req.user.user_id;

        const products = await getLowStockProducts(seller_id);

        return sendSuccess(res, 200, 'Low stock products retrieved successfully', {
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Manually adjust stock - Admin only
 * POST /api/v1/admin/products/:id/adjust-stock
 */
const adjustProductStock = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { new_quantity, reason } = req.body;
        const admin_id = req.user.user_id;

        if (new_quantity === undefined || new_quantity < 0) {
            await transaction.rollback();
            return sendError(res, 400, 'New quantity must be 0 or greater');
        }

        const product = await Product.findByPk(id, { transaction });

        if (!product) {
            await transaction.rollback();
            return sendError(res, 404, 'Product not found');
        }

        // Adjust stock
        const movement = await adjustStock(
            id,
            parseInt(new_quantity),
            reason || 'Admin stock adjustment',
            admin_id,
            transaction
        );

        await transaction.commit();

        return sendSuccess(res, 200, 'Stock adjusted successfully', {
            product_id: id,
            previous_quantity: movement.previous_quantity,
            new_quantity: movement.new_quantity,
            difference: movement.quantity,
            movement_id: movement.movement_id
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get all stock movements - Admin only
 * GET /api/v1/admin/stock-movements
 */
const getAllStockMovements = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            product_id,
            movement_type,
            seller_id
        } = req.query;

        const offset = (page - 1) * limit;
        const where = {};

        if (product_id) where.product_id = product_id;
        if (movement_type) where.movement_type = movement_type;

        const include = [
            {
                model: Product,
                as: 'product',
                attributes: ['product_id', 'name', 'sku', 'seller_id'],
                ...(seller_id && {
                    where: { seller_id }
                })
            },
            {
                model: require('../models').User,
                as: 'performer',
                attributes: ['user_id', 'email', 'phone']
            }
        ];

        const movements = await StockMovement.findAndCountAll({
            where,
            include,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Stock movements retrieved successfully', {
            movements: movements.rows,
            pagination: {
                total: movements.count,
                page: parseInt(page),
                pages: Math.ceil(movements.count / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get low stock alerts across all sellers - Admin only
 * GET /api/v1/admin/stock-alerts
 */
const getStockAlerts = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');

        const products = await Product.findAll({
            where: {
                enable_stock_management: true,
                [Op.and]: [
                    sequelize.where(
                        sequelize.col('stock_quantity'),
                        Op.lte,
                        sequelize.col('low_stock_threshold')
                    )
                ]
            },
            include: [
                {
                    model: require('../models').User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone']
                }
            ],
            attributes: [
                'product_id', 'name', 'sku', 'stock_quantity',
                'low_stock_threshold', 'reserved_stock', 'seller_id'
            ],
            order: [['stock_quantity', 'ASC']]
        });

        return sendSuccess(res, 200, 'Stock alerts retrieved successfully', {
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Seller endpoints
    restockProduct,
    getProductStockHistory,
    getLowStock,
    // Admin endpoints
    adjustProductStock,
    getAllStockMovements,
    getStockAlerts
};
