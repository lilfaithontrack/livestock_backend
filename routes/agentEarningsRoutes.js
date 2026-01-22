const express = require('express');
const router = express.Router();
const agentEarningsController = require('../controllers/agentEarningsController');
const { authenticate, authorize } = require('../middleware/auth');

// Agent routes
router.get('/summary', authenticate, authorize('Agent'), agentEarningsController.getAgentEarningsSummary);
router.get('/history', authenticate, authorize('Agent'), agentEarningsController.getAgentEarningsHistory);
router.put('/bank-account', authenticate, authorize('Agent'), agentEarningsController.updateAgentBankAccount);
router.post('/withdraw', authenticate, authorize('Agent'), agentEarningsController.requestWithdrawal);
router.get('/withdrawals', authenticate, authorize('Agent'), agentEarningsController.getWithdrawalHistory);

// Admin routes
router.get('/admin/stats', authenticate, authorize('Admin'), agentEarningsController.getAllAgentEarningsStats);
router.get('/admin/payouts', authenticate, authorize('Admin'), agentEarningsController.getPendingAgentPayouts);
router.put('/admin/payouts/:id', authenticate, authorize('Admin'), agentEarningsController.processAgentPayout);
router.get('/admin/settings', authenticate, authorize('Admin'), agentEarningsController.getDeliverySettings);
router.put('/admin/settings', authenticate, authorize('Admin'), agentEarningsController.updateDeliverySettings);

module.exports = router;
