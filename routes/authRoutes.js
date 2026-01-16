const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User registration
router.post('/register', authController.register);

// Login with email OTP (Buyer) - New method
router.post('/login/email-otp', authController.loginWithEmailOTP);

// Verify email OTP
router.post('/verify-email-otp', authController.verifyEmailOTP);

// Login with email and password (Seller/Agent)
router.post('/login/email', authController.loginWithEmail);

// Admin login
router.post('/admin/login', authController.adminLogin);

module.exports = router;
