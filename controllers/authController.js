const jwt = require('jsonwebtoken');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateOTP, hashOTP, verifyOTP, getOTPExpiration } = require('../utils/otpGenerator');

// Temporary OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Bot username (configured via env)
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'ethiolivestock_bot';

/**
 * User registration
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { role, email, phone, password, address } = req.body;

        // Validation
        if (!role || !['Buyer', 'Seller', 'Agent'].includes(role)) {
            return sendError(res, 400, 'Valid role is required (Buyer, Seller, Agent)');
        }

        if (role === 'Buyer' && !phone) {
            return sendError(res, 400, 'Phone number is required for Buyers');
        }

        if ((role === 'Seller' || role === 'Agent') && (!email || !password)) {
            return sendError(res, 400, 'Email and password are required for Sellers and Agents');
        }

        // Create user
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
 * Request OTP for phone (Login or Registration)
 * POST /api/v1/auth/login/phone
 * This endpoint works for both login and registration
 */
const loginWithPhone = async (req, res, next) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return sendError(res, 400, 'Phone number is required');
        }

        // Normalize phone number
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        // Check if user exists (for login) or doesn't exist (for registration)
        const user = await User.findOne({ where: { phone: normalizedPhone } });
        const isNewUser = !user;

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);
        const expiresAt = getOTPExpiration();

        // Store OTP
        otpStore.set(normalizedPhone, { otpHash, expiresAt });

        // Try to send OTP via PHP Telegram service
        let otpSent = false;
        let telegramLinked = false;

        try {
            const { sendOTP } = require('../services/telegramBot');

            // Check if user exists and has Telegram linked
            if (user && user.telegram_id) {
                telegramLinked = true;
                otpSent = await sendOTP(user.telegram_id, otp, normalizedPhone);
                if (otpSent) {
                    console.log(`✓ OTP sent to Telegram user ${user.telegram_id} for ${normalizedPhone}`);
                }
            }
        } catch (error) {
            console.error('Error sending OTP via Telegram:', error.message);
        }

        // Always return success - OTP is generated
        // If Telegram failed, return OTP in response for now
        const returnOTP = !otpSent || process.env.NODE_ENV === 'development';

        return sendSuccess(res, 200,
            otpSent
                ? 'OTP sent to your Telegram'
                : telegramLinked
                    ? 'OTP generated (Telegram delivery failed - use code below)'
                    : 'OTP generated - link Telegram for automatic delivery',
            {
                message: otpSent
                    ? 'Please check your Telegram for the OTP code'
                    : 'Enter the OTP code to continue',
                otp: returnOTP ? otp : undefined,
                telegram_linked: telegramLinked,
                telegram_connection_failed: telegramLinked && !otpSent,
                is_new_user: isNewUser,
                telegram_bot_username: TELEGRAM_BOT_USERNAME,
                // Simple bot link (no complex linking tokens needed)
                telegram_bot_link: `https://t.me/${TELEGRAM_BOT_USERNAME}`
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Login with email (Seller/Agent)
 * POST /api/v1/auth/login/email
 */
const loginWithEmail = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return sendError(res, 404, 'Invalid email or password');
        }

        // Verify password
        const isValidPassword = await user.validatePassword(password);

        if (!isValidPassword) {
            return sendError(res, 401, 'Invalid email or password');
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
 * Verify OTP (Buyer)
 * POST /api/v1/auth/verify-otp
 */
const verifyOTPHandler = async (req, res, next) => {
    try {
        const { phone, otp, name } = req.body;

        console.log('[OTP Verify] Request received:', { phone, otp: otp ? `${otp.substring(0, 2)}****` : 'undefined', name });

        if (!phone || !otp) {
            return sendError(res, 400, 'Phone and OTP are required');
        }

        // Normalize phone number
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        console.log('[OTP Verify] Normalized phone:', normalizedPhone);

        // Get stored OTP
        const otpData = otpStore.get(normalizedPhone);
        console.log('[OTP Verify] OTP data found:', otpData ? 'yes' : 'no');

        if (!otpData) {
            return sendError(res, 400, 'OTP not found or expired. Please request a new one.');
        }

        // Check expiration
        if (new Date() > new Date(otpData.expiresAt)) {
            otpStore.delete(normalizedPhone);
            return sendError(res, 400, 'OTP expired. Please request a new one.');
        }

        // Verify OTP - ensure otp is a string
        const otpString = String(otp).trim();
        const isValid = await verifyOTP(otpString, otpData.otpHash);
        console.log('[OTP Verify] OTP valid:', isValid);

        if (!isValid) {
            return sendError(res, 401, 'Invalid OTP');
        }

        // Remove OTP from store
        otpStore.delete(normalizedPhone);

        // Find or create user
        let user = await User.findOne({ where: { phone: normalizedPhone } });
        const isNewUser = !user;

        // If user doesn't exist, create a new Buyer account
        if (!user) {
            user = await User.create({
                role: 'Buyer',
                phone: normalizedPhone,
                email: null,
                password_hash: null,
                address: name || null
            });
            console.log(`New user created via OTP: ${user.user_id}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                phone: user.phone
            },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        return sendSuccess(res, 200, 'OTP verified successfully', {
            token,
            user: {
                user_id: user.user_id,
                role: user.role,
                phone: user.phone,
                email: user.email || null,
                is_new_user: isNewUser
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

        // Find admin user
        const user = await User.findOne({ where: { email, role: 'Admin' } });

        if (!user) {
            return sendError(res, 401, 'Invalid email or password');
        }

        // Verify password
        const isValidPassword = await user.validatePassword(password);

        if (!isValidPassword) {
            return sendError(res, 401, 'Invalid email or password');
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
    loginWithPhone,
    loginWithEmail,
    adminLogin,
    verifyOTP: verifyOTPHandler,
    otpStore
};
