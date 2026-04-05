const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const sellerSettingsController = require('../controllers/sellerSettingsController');
const sellerDeliveryController = require('../controllers/sellerDeliveryController');
const sellerDeliveryAgentController = require('../controllers/sellerDeliveryAgentController');
const { SellerEarnings } = require('../models');

// ============ SELLER EARNINGS ROUTE ============

// Get seller wallet/earnings summary - used by mobile wallet screen
router.get('/earnings', verifyToken, requireRole(['Seller']), async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const totalEarned = await SellerEarnings.sum('net_amount', {
            where: { seller_id }
        }) || 0;

        const pendingClearance = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'pending' }
        }) || 0;

        const availableForWithdrawal = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'available' }
        }) || 0;

        const totalWithdrawn = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'withdrawn' }
        }) || 0;

        res.json({
            earnings: {
                total_earned: totalEarned,
                pending_clearance: pendingClearance,
                available_for_withdrawal: availableForWithdrawal,
                total_withdrawn: totalWithdrawn
            }
        });
    } catch (error) {
        console.error('Error fetching seller earnings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch earnings' });
    }
});

// ============ SELLER SETTINGS ROUTES ============

// Get seller settings
router.get('/settings', verifyToken, requireRole(['Seller']), sellerSettingsController.getSellerSettings);

// Update seller settings
router.put('/settings', verifyToken, requireRole(['Seller']), sellerSettingsController.updateSellerSettings);

// Add preferred agent
router.post('/settings/agents/preferred', verifyToken, requireRole(['Seller']), sellerSettingsController.addPreferredAgent);

// Remove preferred agent
router.delete('/settings/agents/preferred/:agentId', verifyToken, requireRole(['Seller']), sellerSettingsController.removePreferredAgent);

// Block agent
router.post('/settings/agents/blocked', verifyToken, requireRole(['Seller']), sellerSettingsController.blockAgent);

// ============ DELIVERY MANAGEMENT ROUTES ============

// Register delivery for order
router.post('/orders/:orderId/register-delivery', verifyToken, requireRole(['Seller']), sellerDeliveryController.registerDelivery);

// Get available agents
router.get('/delivery/available-agents', verifyToken, requireRole(['Seller']), sellerDeliveryController.getAvailableAgents);

// Get seller's deliveries
router.get('/deliveries', verifyToken, requireRole(['Seller']), sellerDeliveryController.getSellerDeliveries);

// Get delivery details
router.get('/deliveries/:deliveryId', verifyToken, requireRole(['Seller']), sellerDeliveryController.getDeliveryDetails);

// Update delivery assignment
router.put('/deliveries/:deliveryId/assign', verifyToken, requireRole(['Seller']), sellerDeliveryController.updateDeliveryAssignment);

// Cancel delivery
router.put('/deliveries/:deliveryId/cancel', verifyToken, requireRole(['Seller']), sellerDeliveryController.cancelDelivery);

// ============ SELLER DELIVERY AGENT ROUTES ============

// Register a new delivery agent
router.post('/delivery-agents', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.registerAgent);

// Get all seller's delivery agents
router.get('/delivery-agents', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.getAgents);

// Get single delivery agent details
router.get('/delivery-agents/:id', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.getAgentById);

// Update delivery agent
router.put('/delivery-agents/:id', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.updateAgent);

// Deactivate delivery agent (soft)
router.delete('/delivery-agents/:id', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.deactivateAgent);

// Permanently delete delivery agent
router.delete('/delivery-agents/:id/delete', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.deleteAgent);

// Toggle agent availability
router.put('/delivery-agents/:id/availability', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.toggleAvailability);

// Get agent stats
router.get('/delivery-agents/:id/stats', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.getAgentStats);

// Assign seller's own delivery agent to an order
router.post('/orders/:orderId/assign-agent', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.assignAgentToOrder);

// Get all active delivery tracking for seller
router.get('/delivery-tracking', verifyToken, requireRole(['Seller']), sellerDeliveryAgentController.getDeliveryTracking);

module.exports = router;
