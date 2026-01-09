const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User registration
router.post('/register', authController.register);

// Login with phone (Buyer)
router.post('/login/phone', authController.loginWithPhone);

// Login with email (Seller/Agent)
router.post('/login/email', authController.loginWithEmail);

// Verify OTP
router.post('/verify-otp', authController.verifyOTP);

// Admin login
router.post('/admin/login', authController.adminLogin);

module.exports = router;
