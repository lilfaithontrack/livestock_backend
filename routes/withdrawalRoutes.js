const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Seller routes
router.post('/', authorize('Seller'), withdrawalController.requestWithdrawal);
router.get('/my', authorize('Seller'), withdrawalController.getMyWithdrawals);
router.get('/my/:id', authorize('Seller'), withdrawalController.getWithdrawalById);

// Admin routes
router.get('/all', authorize('Admin'), withdrawalController.getAllWithdrawals);
router.get('/pending', authorize('Admin'), withdrawalController.getPendingWithdrawals);
router.get('/stats', authorize('Admin'), withdrawalController.getWithdrawalStats);
router.put('/:id/approve', authorize('Admin'), withdrawalController.approveWithdrawal);
router.put('/:id/process', authorize('Admin'), withdrawalController.processWithdrawal);
router.put('/:id/complete', authorize('Admin'), withdrawalController.completeWithdrawal);
router.put('/:id/reject', authorize('Admin'), withdrawalController.rejectWithdrawal);

module.exports = router;
