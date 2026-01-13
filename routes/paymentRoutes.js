const express = require('express');
const router = express.Router();
const {
    initializePayment,
    verifyPayment,
    chapaWebhook,
    telebirrWebhook,
    getAllPayments,
    getPaymentById,
    getPaymentStats,
    updatePaymentStatus,
    paymentReturn
} = require('../controllers/paymentController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Public webhook endpoints (no auth - called by payment gateways)
router.post('/webhook/chapa', chapaWebhook);
router.post('/webhook/telebirr', telebirrWebhook);

// Payment return page
router.get('/return', paymentReturn);

// Admin routes (must be before :id route to avoid conflict)
router.get('/stats', verifyToken, requireRole(['Admin']), getPaymentStats);

// User payment routes
router.post('/initialize', verifyToken, initializePayment);
router.get('/verify/:tx_ref', verifyToken, verifyPayment);

// Admin routes
router.get('/', verifyToken, requireRole(['Admin']), getAllPayments);
router.get('/:id', verifyToken, requireRole(['Admin']), getPaymentById);
router.put('/:id/status', verifyToken, requireRole(['Admin']), updatePaymentStatus);

module.exports = router;
