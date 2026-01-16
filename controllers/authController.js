const jwt = require('jsonwebtoken');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateOTP, hashOTP, verifyOTP, getOTPExpiration } = require('../utils/otpGenerator');
const { sendOTPEmail } = require('../services/emailService');

// Temporary OTP storage (in production, use Redis or database)
const otpStore = new Map();

/**
 * User registration
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { role, email, phone, password, address } = req.body;

        if (!role || !['Buyer', 'Seller', 'Agent'].includes(role)) {
            return sendError(res, 400, 'Valid role is required (Buyer, Seller, Agent)');
        }

        if (role === 'Buyer' && !email) {
            return sendError(res, 400, 'Email is required for Buyers');
        }

        if ((role === 'Seller' || role === 'Agent') && (!email || !password)) {
            return sendError(res, 400, 'Email and password are required for Sellers and Agents');
        }

        const user = await User.create({
            role,
            email: email || null,
            phone: phone || null,
            password_hash: password || null,
            address: address || null
        });

        return sendSuccess(res, 201, 'User registered successfully', {
            user_id: user.user_id,
            role: user.role,
            email: user.email,
            phone: user.phone
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request OTP for email (Login or Registration)
 * POST /api/v1/auth/login/email-otp
 * For buyers - login with email and OTP
 */
const loginWithEmailOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendError(res, 400, 'Email is required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return sendError(res, 400, 'Invalid email format');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const user = await User.findOne({ where: { email: normalizedEmail } });
        const isNewUser = !user;

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);
        const expiresAt = getOTPExpiration();

        // Store OTP keyed by email
        otpStore.set(normalizedEmail, { otpHash, expiresAt });

        // Send OTP via email
        let otpSent = false;
        try {
            otpSent = await sendOTPEmail(normalizedEmail, otp, null);
        } catch (error) {
            console.error('Error sending OTP email:', error.message);
        }

        // For development, always return OTP
        const returnOTP = !otpSent || process.env.NODE_ENV === 'development';

        return sendSuccess(res, 200,
            otpSent ? 'OTP sent to your email' : 'OTP generated',
            {
                message: otpSent
                    ? 'Please check your email for the OTP code'
                    : 'Enter the OTP code to continue',
                otp: returnOTP ? otp : undefined,
                email_sent: otpSent,
                is_new_user: isNewUser
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Verify OTP for email login
 * POST /api/v1/auth/verify-email-otp
 */
const verifyEmailOTP = async (req, res, next) => {
    try {
        const { email, otp, name } = req.body;

        if (!email || !otp) {
            return sendError(res, 400, 'Email and OTP are required');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Get stored OTP
        const otpData = otpStore.get(normalizedEmail);

        if (!otpData) {
            return sendError(res, 400, 'OTP not found or expired. Please request a new one.');
        }

        // Check expiration
        if (new Date() > new Date(otpData.expiresAt)) {
            otpStore.delete(normalizedEmail);
            return sendError(res, 400, 'OTP expired. Please request a new one.');
        }

        // Verify OTP
        const otpString = String(otp).trim();
        const isValid = await verifyOTP(otpString, otpData.otpHash);

        if (!isValid) {
            return sendError(res, 401, 'Invalid OTP');
        }

        // Remove OTP from store
        otpStore.delete(normalizedEmail);

        // Find or create user
        let user = await User.findOne({ where: { email: normalizedEmail } });
        const isNewUser = !user;

        if (!user) {
            user = await User.create({
                role: 'Buyer',
                email: normalizedEmail,
                phone: null,
                password_hash: null,
                address: name || null
            });
            console.log(`New user created via email OTP: ${user.user_id}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                email: user.email
            },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        return sendSuccess(res, 200, 'OTP verified successfully', {
            token,
            user: {
                user_id: user.user_id,
                role: user.role,
                email: user.email,
                phone: user.phone || null,
                is_new_user: isNewUser
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login with email and password (Seller/Agent)
 * POST /api/v1/auth/login/email
 */
const loginWithEmail = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return sendError(res, 404, 'Invalid email or password');
        }

        const isValidPassword = await user.validatePassword(password);

        if (!isValidPassword) {
            return sendError(res, 401, 'Invalid email or password');
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                email: user.email
            },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        return sendSuccess(res, 200, 'Login successful', {
            token,
            user: {
                user_id: user.user_id,
                role: user.role,
                email: user.email,
                kyc_status: user.kyc_status
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin login
 * POST /api/v1/auth/admin/login
 */
const adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        const user = await User.findOne({ where: { email, role: 'Admin' } });

        if (!user) {
            return sendError(res, 401, 'Invalid email or password');
        }

        const isValidPassword = await user.validatePassword(password);

        if (!isValidPassword) {
            return sendError(res, 401, 'Invalid email or password');
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                email: user.email
            },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        return sendSuccess(res, 200, 'Login successful', {
            token,
            user: {
                user_id: user.user_id,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    loginWithEmailOTP,
    verifyEmailOTP,
    loginWithEmail,
    adminLogin,
    otpStore
};
