const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Assign delivery (Admin only)
router.post('/assign', verifyToken, requireRole(['Admin']), deliveryController.assignDelivery);

// Get agent deliveries
router.get('/agent/:agentId', verifyToken, requireRole(['Agent', 'Admin']), deliveryController.getAgentDeliveries);

// Start delivery trip (Agent)
router.post('/start/:deliveryId', verifyToken, requireRole(['Agent']), deliveryController.startTrip);

// Verify handover with OTP/QR (Agent)
router.post('/handover/:deliveryId', verifyToken, requireRole(['Agent']), deliveryController.verifyHandover);

// Admin routes - Get all deliveries
router.get('/', verifyToken, deliveryController.getAllDeliveries);

// Get delivery by ID
router.get('/:id', verifyToken, deliveryController.getDeliveryById);

// Update delivery details (Admin only)
router.put('/:id', verifyToken, requireRole(['Admin']), deliveryController.updateDelivery);

// Admin routes - Update delivery status
router.put('/:id/status', verifyToken, requireRole(['Admin', 'Agent']), deliveryController.updateStatus);

// Delete delivery (Admin only)
router.delete('/:id', verifyToken, requireRole(['Admin']), deliveryController.deleteDelivery);

module.exports = router;
