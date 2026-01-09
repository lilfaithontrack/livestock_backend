const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Get user profile (authenticated users)
router.get('/profile', verifyToken, userController.getProfile);

// Update user profile (authenticated users)
router.put('/profile', verifyToken, userController.updateProfile);

// Upload KYC documents (Seller only)
router.post(
    '/kyc/documents',
    verifyToken,
    requireRole(['Seller']),
    upload.fields([
        { name: 'trade_license', maxCount: 1 },
        { name: 'national_id_front', maxCount: 1 },
        { name: 'national_id_back', maxCount: 1 }
    ]),
    userController.uploadKYCDocuments
);

// Get KYC documents status (Seller only)
router.get('/kyc/documents', verifyToken, requireRole(['Seller']), userController.getKYCDocumentsStatus);

// Become a Seller - Change role and upload KYC documents (Buyer only)
router.post(
    '/become-seller',
    verifyToken,
    requireRole(['Buyer']),
    upload.fields([
        { name: 'trade_license', maxCount: 1 },
        { name: 'national_id_front', maxCount: 1 },
        { name: 'national_id_back', maxCount: 1 }
    ]),
    userController.becomeSeller
);

// Update KYC status (Admin only)
router.put('/:userId/kyc', verifyToken, requireRole(['Admin']), userController.updateKYCStatus);

module.exports = router;
