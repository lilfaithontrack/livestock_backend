const express = require('express');
const router = express.Router();
const productTypeController = require('../controllers/productTypeController');

// Public routes - no authentication required
// GET /api/v1/product-types - Get all product types
router.get('/', productTypeController.getAllProductTypes);

// GET /api/v1/product-types/:id - Get product type by ID with categories
router.get('/:id', productTypeController.getProductTypeById);

// GET /api/v1/product-types/:id/categories - Get categories for a product type
router.get('/:id/categories', productTypeController.getProductTypeCategories);

module.exports = router;
