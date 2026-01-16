const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Create order / checkout (Buyer and Seller - sellers can also buy)
router.post('/checkout', verifyToken, requireRole(['Buyer', 'Seller']), orderController.createOrder);

// Get user's orders (buyer orders)
router.get('/', verifyToken, orderController.getOrders);

// Get seller's orders (orders containing seller's products)
router.get('/seller', verifyToken, requireRole(['Seller']), orderController.getSellerOrders);

// Get order by ID
router.get('/:id', verifyToken, orderController.getOrderById);

// Update order status (Admin)
router.put('/:id/status', verifyToken, requireRole(['Admin']), orderController.updateOrderStatus);

// Upload payment proof (Buyer and Seller - sellers can also buy)
router.post('/:id/payment-proof', verifyToken, requireRole(['Buyer', 'Seller']), upload.single('payment_proof'), orderController.uploadPaymentProof);

module.exports = router;

