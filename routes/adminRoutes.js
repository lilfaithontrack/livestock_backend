const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { validateProductCreation } = require('../middleware/productValidation');

// All routes require Admin role
router.use(verifyToken);
router.use(requireRole(['Admin']));

// Get dashboard statistics
router.get('/dashboard', adminController.getDashboardStats);

// Get pending products
router.get('/products/pending', adminController.getPendingProducts);

// Approve product
router.put('/products/:id/approve', adminController.approveProduct);

// Reject product
router.put('/products/:id/reject', adminController.rejectProduct);

// Get all users
router.get('/users', adminController.getAllUsers);

// Get all products (admin view)
router.get('/products', adminController.getAllProducts);

// Create product (admin can create products)
router.post('/products', upload.array('images', 10), validateProductCreation, productController.createProduct);

// Update product (admin)
router.put('/products/:id', upload.array('images', 10), productController.updateProduct);

// Delete product (admin)
router.delete('/products/:id', productController.deleteProduct);

// Get all orders (admin view)
router.get('/orders', adminController.getAllOrders);

module.exports = router;
