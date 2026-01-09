const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
    validateProductCreation,
    validateProductUpdate
} = require('../middleware/productValidation');

// Browse products (public)
router.get('/', productController.getProducts);

// Get product by ID (public)
router.get('/:id', productController.getProductById);

// Get seller's products (Seller only)
router.get(
    '/seller/products',
    verifyToken,
    requireRole(['Seller']),
    productController.getSellerProducts
);

// Create product (Seller only)
router.post(
    '/seller/products',
    verifyToken,
    requireRole(['Seller']),
    upload.array('images', 10),
    validateProductCreation,  // Add validation middleware
    productController.createProduct
);

// Update product (Seller only)
router.put(
    '/seller/products/:id',
    verifyToken,
    requireRole(['Seller']),
    upload.array('images', 10),
    validateProductUpdate,  // Add validation middleware
    productController.updateProduct
);

// Delete product (Seller only)
router.delete(
    '/seller/products/:id',
    verifyToken,
    requireRole(['Seller']),
    productController.deleteProduct
);

module.exports = router;
