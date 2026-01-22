const express = require('express');
const router = express.Router();
const adminBankAccountController = require('../controllers/adminBankAccountController');

// Public route - no authentication required
// Get active admin bank accounts for sellers to make payments
router.get('/', adminBankAccountController.getActiveAccounts);

module.exports = router;
