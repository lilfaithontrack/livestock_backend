const express = require('express');
const router = express.Router();
const qerchaController = require('../controllers/qerchaController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { validateProductCreation } = require('../middleware/productValidation');

const isAdmin = requireRole(['Admin']);

// Create Qercha package (authenticated users)
router.post('/packages', verifyToken, qerchaController.createPackage);

// Seller: create a NEW product + Qercha package together, atomically (mirrors admin's with-qercha flow)
router.post(
    '/seller/products-with-package',
    verifyToken,
    requireRole(['Seller']),
    upload.array('images', 10),
    validateProductCreation,
    qerchaController.createSellerProductWithQercha
);

// Join/participate in package
router.post('/packages/:id/join', verifyToken, qerchaController.joinPackage);

// Get available packages (public - approved & active only)
router.get('/packages', qerchaController.getPackages);

// Get package details
router.get('/packages/:id', qerchaController.getPackageDetails);

// Host updates package (seller / admin)
router.put('/packages/:id', verifyToken, qerchaController.updateSellerPackage);

// Admin routes - Get all qercha packages (any status)
router.get('/', verifyToken, isAdmin, qerchaController.adminGetPackages);

// Admin routes - Approve / reject package moderation
router.put('/admin/:id/approve', verifyToken, isAdmin, qerchaController.approvePackage);
router.put('/admin/:id/reject', verifyToken, isAdmin, qerchaController.rejectPackage);

// Admin routes - Update package (lifecycle) status
router.put('/:id/status', verifyToken, isAdmin, qerchaController.updatePackageStatus);

module.exports = router;
