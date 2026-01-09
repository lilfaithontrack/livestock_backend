const express = require('express');
const router = express.Router();
const butcherController = require('../controllers/butcherController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// All routes require Admin authentication

// Get all butchers (Admin only)
router.get('/', verifyToken, requireRole(['Admin']), butcherController.getAllButchers);

// Get butcher by ID (Admin only)
router.get('/:id', verifyToken, requireRole(['Admin']), butcherController.getButcherById);

// Create new butcher (Admin only)
router.post('/', verifyToken, requireRole(['Admin']), butcherController.createButcher);

// Update butcher (Admin only)
router.put('/:id', verifyToken, requireRole(['Admin']), butcherController.updateButcher);

// Delete butcher (Admin only)
router.delete('/:id', verifyToken, requireRole(['Admin']), butcherController.deleteButcher);

// Toggle butcher status (Admin only)
router.patch('/:id/toggle', verifyToken, requireRole(['Admin']), butcherController.toggleButcherStatus);

module.exports = router;
