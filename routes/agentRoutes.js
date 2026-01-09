const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Get all delivery agents (Admin only)
router.get('/', verifyToken, requireRole(['Admin']), agentController.getAllAgents);

// Get agent by ID (Admin only)
router.get('/:id', verifyToken, requireRole(['Admin']), agentController.getAgentById);

// Create new delivery agent (Admin only)
router.post('/', verifyToken, requireRole(['Admin']), agentController.createAgent);

// Update agent (Admin only)
router.put('/:id', verifyToken, requireRole(['Admin']), agentController.updateAgent);

// Delete agent (Admin only)
router.delete('/:id', verifyToken, requireRole(['Admin']), agentController.deleteAgent);

module.exports = router;
