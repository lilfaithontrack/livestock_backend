const express = require('express');
const router = express.Router();
const earningsController = require('../controllers/earningsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Seller routes
router.get('/summary', authorize('Seller'), earningsController.getEarningsSummary);
router.get('/available', authorize('Seller'), earningsController.getAvailableBalance);
router.get('/history', authorize('Seller'), earningsController.getEarningsHistory);
router.get('/dashboard', authorize('Seller'), earningsController.getSellerDashboard);

// Admin routes
router.get('/stats', authorize('Admin'), earningsController.getAllEarningsStats);

module.exports = router;
