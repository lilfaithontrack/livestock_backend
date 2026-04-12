const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// ============ ADMIN ROUTES (specific paths first) ============

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

// ============ AGENT ROUTES ============

// Get agent's assigned orders
router.get('/agent/orders/assigned', verifyToken, requireRole(['Agent']), deliveryController.getAgentAssignedOrders);

// Agent accepts delivery assignment
router.post('/agent/orders/:id/accept', verifyToken, requireRole(['Agent']), deliveryController.acceptDelivery);

// Agent rejects delivery assignment
router.post('/agent/orders/:id/reject', verifyToken, requireRole(['Agent']), deliveryController.rejectDelivery);

// Agent confirms pickup from seller
router.post('/agent/orders/:id/pickup', verifyToken, requireRole(['Agent', 'Seller']), deliveryController.confirmPickup);

// Agent verifies delivery with QR/OTP
router.post('/agent/orders/:id/verify', verifyToken, requireRole(['Agent', 'Seller']), deliveryController.verifyDelivery);

// Update agent location
router.put('/agent/location', verifyToken, requireRole(['Agent']), deliveryController.updateAgentLocation);

// Get agent deliveries
router.get('/agent/:agentId', verifyToken, requireRole(['Agent', 'Admin']), deliveryController.getAgentDeliveries);

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

// ============ GENERIC ROUTES (wildcard /:id MUST come last) ============

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
