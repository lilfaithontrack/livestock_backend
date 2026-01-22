const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// ============ ADMIN ROUTES ============

// Assign delivery (Admin only) - legacy
router.post('/assign', verifyToken, requireRole(['Admin']), deliveryController.assignDelivery);

// Approve order for delivery (generates QR & OTP)
router.post('/admin/orders/:id/approve', verifyToken, requireRole(['Admin']), deliveryController.approveOrderForDelivery);

// Get approved orders pending assignment
router.get('/admin/orders/approved', verifyToken, requireRole(['Admin']), deliveryController.getApprovedOrders);

// Assign agent to order
router.post('/admin/orders/:id/assign-agent', verifyToken, requireRole(['Admin']), deliveryController.assignAgentToOrder);

// Get nearby agents
router.get('/admin/agents/nearby', verifyToken, requireRole(['Admin']), deliveryController.getNearbyAgents);

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

// ============ AGENT ROUTES ============

// Get agent deliveries
router.get('/agent/:agentId', verifyToken, requireRole(['Agent', 'Admin']), deliveryController.getAgentDeliveries);

// Get agent's assigned orders
router.get('/agent/orders/assigned', verifyToken, requireRole(['Agent']), deliveryController.getAgentAssignedOrders);

// Update agent location
router.put('/agent/location', verifyToken, requireRole(['Agent']), deliveryController.updateAgentLocation);

// Agent confirms pickup from seller
router.post('/agent/orders/:id/pickup', verifyToken, requireRole(['Agent', 'Seller']), deliveryController.confirmPickup);

// Agent verifies delivery with QR/OTP
router.post('/agent/orders/:id/verify', verifyToken, requireRole(['Agent', 'Seller']), deliveryController.verifyDelivery);

// Start delivery trip (Agent) - legacy
router.post('/start/:deliveryId', verifyToken, requireRole(['Agent']), deliveryController.startTrip);

// Verify handover with OTP/QR (Agent) - legacy
router.post('/handover/:deliveryId', verifyToken, requireRole(['Agent']), deliveryController.verifyHandover);

// ============ SELLER ROUTES ============

// Seller opts to deliver their own order
router.post('/seller/orders/:id/self-deliver', verifyToken, requireRole(['Seller']), deliveryController.sellerSelfDeliver);

// ============ BUYER ROUTES ============

// Get order QR code
router.get('/orders/:id/qr-code', verifyToken, deliveryController.getOrderQRCode);

// Resend delivery OTP
router.post('/orders/:id/resend-otp', verifyToken, deliveryController.resendDeliveryOTP);

module.exports = router;
