const express = require('express');
const router = express.Router();
const {
    restockProduct,
    getProductStockHistory,
    getLowStock,
    adjustProductStock,
    getAllStockMovements,
    getStockAlerts
} = require('../controllers/stockController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// ==================== SELLER ROUTES ====================

/**
 * @route   POST /api/v1/seller/products/:id/restock
 * @desc    Add stock to a product
 * @access  Seller
 */
router.post(
    '/seller/products/:id/restock',
    verifyToken,
    requireRole(['Seller']),
    restockProduct
);

/**
 * @route   GET /api/v1/seller/products/:id/stock-history
 * @desc    Get stock movement history for a product
 * @access  Seller (own products only)
 */
router.get(
    '/seller/products/:id/stock-history',
    verifyToken,
    requireRole(['Seller']),
    getProductStockHistory
);

/**
 * @route   GET /api/v1/seller/products/low-stock
 * @desc    Get seller's products with low stock
 * @access  Seller
 */
router.get(
    '/seller/products/low-stock',
    verifyToken,
    requireRole(['Seller']),
    getLowStock
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/v1/admin/products/:id/adjust-stock
 * @desc    Manually adjust product stock
 * @access  Admin
 */
router.post(
    '/admin/products/:id/adjust-stock',
    verifyToken,
    requireRole(['Admin']),
    adjustProductStock
);

/**
 * @route   GET /api/v1/admin/stock-movements
 * @desc    Get all stock movements with filters
 * @access  Admin
 */
router.get(
    '/admin/stock-movements',
    verifyToken,
    requireRole(['Admin']),
    getAllStockMovements
);

/**
 * @route   GET /api/v1/admin/stock-alerts
 * @desc    Get all products with low stock across all sellers
 * @access  Admin
 */
router.get(
    '/admin/stock-alerts',
    verifyToken,
    requireRole(['Admin']),
    getStockAlerts
);

module.exports = router;
