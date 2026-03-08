const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const sellerSettingsController = require('../controllers/sellerSettingsController');
const sellerDeliveryController = require('../controllers/sellerDeliveryController');

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

module.exports = router;
