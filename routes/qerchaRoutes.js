const express = require('express');
const router = express.Router();
const qerchaController = require('../controllers/qerchaController');
const verifyToken = require('../middleware/authMiddleware');

// Create Qercha package (authenticated users)
router.post('/packages', verifyToken, qerchaController.createPackage);

// Join/participate in package
router.post('/packages/:id/join', verifyToken, qerchaController.joinPackage);

// Get available packages (public or authenticated)
router.get('/packages', qerchaController.getPackages);

// Get package details
router.get('/packages/:id', qerchaController.getPackageDetails);

// Admin routes - Get all qercha packages
router.get('/', qerchaController.getPackages);

// Admin routes - Update package status
router.put('/:id/status', verifyToken, qerchaController.updatePackageStatus);

module.exports = router;
