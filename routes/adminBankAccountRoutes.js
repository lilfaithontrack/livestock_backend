const express = require('express');
const router = express.Router();
const adminBankAccountController = require('../controllers/adminBankAccountController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('Admin'));

// CRUD operations
router.post('/', adminBankAccountController.createBankAccount);
router.get('/', adminBankAccountController.getAllBankAccounts);
router.get('/:id', adminBankAccountController.getBankAccountById);
router.put('/:id', adminBankAccountController.updateBankAccount);
router.delete('/:id', adminBankAccountController.deleteBankAccount);

// Special operations
router.put('/:id/primary', adminBankAccountController.setPrimaryAccount);
router.put('/:id/toggle-status', adminBankAccountController.toggleAccountStatus);

module.exports = router;
