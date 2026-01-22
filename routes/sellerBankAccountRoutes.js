const express = require('express');
const router = express.Router();
const sellerBankAccountController = require('../controllers/sellerBankAccountController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require seller authentication
router.use(authenticate);

// Seller routes
router.post('/', authorize('Seller'), sellerBankAccountController.createBankAccount);
router.get('/', authorize('Seller'), sellerBankAccountController.getMyBankAccounts);
router.get('/:id', authorize('Seller'), sellerBankAccountController.getBankAccountById);
router.put('/:id', authorize('Seller'), sellerBankAccountController.updateBankAccount);
router.delete('/:id', authorize('Seller'), sellerBankAccountController.deleteBankAccount);
router.put('/:id/primary', authorize('Seller'), sellerBankAccountController.setPrimaryAccount);

// Admin route to verify bank account
router.put('/:id/verify', authorize('Admin'), sellerBankAccountController.verifyBankAccount);

module.exports = router;
