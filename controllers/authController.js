const jwt = require('jsonwebtoken');
const { User, TelegramMapping } = require('../models');
const jwtConfig = require('../config/jwt');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateOTP, hashOTP, verifyOTP, getOTPExpiration } = require('../utils/otpGenerator');
const { sendOTP } = require('../services/telegramBot');

// Temporary OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Temporary linking token storage (in production, use Redis)
const linkingTokens = new Map();

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

        const { phone, telegram_username } = req.body;

        if (!phone) {
            return sendError(res, 400, 'Phone number is required');
        }

        // Normalize phone number
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        // Check if user exists (for login) or doesn't exist (for registration)
        const user = await User.findOne({ where: { phone: normalizedPhone, role: 'Buyer' } });
        const isNewUser = !user; // Determine if this is a new user
        
        // Note: We allow OTP generation even if user doesn't exist (for registration flow)

        // Optional: Try to auto-link if telegram_username is provided
        if (telegram_username) {
            try {
                const { getBot } = require('../services/telegramBot');
                const bot = getBot();
                if (bot) {
                    // Try to get user by username
                    const chat = await bot.getChat(`@${telegram_username.replace('@', '')}`);
                    if (chat && chat.id) {
                        // Auto-create or update mapping
                        const [mapping] = await TelegramMapping.findOrCreate({
                            where: { phone: normalizedPhone },
                            defaults: {
                                telegram_user_id: chat.id,
                                telegram_username: telegram_username.replace('@', ''),
                                is_verified: false
                            }
                        });
                        
                        if (!mapping.telegram_user_id || mapping.telegram_user_id !== chat.id) {
                            await mapping.update({
                                telegram_user_id: chat.id,
                                telegram_username: telegram_username.replace('@', '')
                            });
                        }
                        console.log(`Auto-linked phone ${normalizedPhone} to Telegram @${telegram_username}`);
                    }
                }
            } catch (linkError) {
                // If auto-linking fails, continue without it (not critical)
                console.log(`Auto-link failed for ${telegram_username}: ${linkError.message}`);
            }
        }

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);
        const expiresAt = getOTPExpiration();

        // Store OTP (in production, use Redis or database)
        otpStore.set(normalizedPhone, { otpHash, expiresAt });

        // Generate a temporary linking token for automatic linking
        const linkingToken = require('crypto').randomBytes(16).toString('hex');
        const tokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store linking token with OTP for automatic sending after link
        linkingTokens.set(linkingToken, {
            phone: normalizedPhone,
            otp: otp, // Store OTP so we can send it after linking
            expiresAt: tokenExpiry
        });

        // Try to send OTP via Telegram bot (automatic - no linking required)
        let otpSent = false;
        let otpSentMethod = null;
        try {
            const { sendOTPByPhone, sendOTP } = require('../services/telegramBot');
            
            // First, try existing mapping (if user linked before)
            const mapping = await TelegramMapping.findOne({
                where: { phone: normalizedPhone }
            });

            if (mapping && mapping.telegram_user_id) {
                otpSent = await sendOTP(mapping.telegram_user_id, otp, normalizedPhone);
                if (otpSent) {
                    otpSentMethod = 'existing_mapping';
                    await mapping.update({ last_otp_sent_at: new Date() });
                }
            }

            // If not sent via mapping, try automatic phone-based sending
            if (!otpSent) {
                const result = await sendOTPByPhone(normalizedPhone, otp);
                if (result.success) {
                    otpSent = true;
                    otpSentMethod = result.method;
                    
                    // If we found the user, create/update mapping for future use
                    if (result.userId) {
                        await TelegramMapping.findOrCreate({
                            where: { phone: normalizedPhone },
                            defaults: {
                                telegram_user_id: result.userId,
                                phone: normalizedPhone,
                                is_verified: false
                            }
                        });
                    }
                }
            }

            // Alternative: Try sending via public channel if configured
            if (!otpSent && process.env.TELEGRAM_OTP_CHANNEL_ID) {
                const { sendOTPViaChannel } = require('../services/telegramBot');
                otpSent = await sendOTPViaChannel(normalizedPhone, otp, process.env.TELEGRAM_OTP_CHANNEL_ID);
                if (otpSent) {
                    otpSentMethod = 'public_channel';
                }
            }
        } catch (error) {
            console.error('Error sending OTP via Telegram:', error);
        }

        // If Telegram sending failed or user not linked, still allow OTP generation
        // In development, return OTP in response. In production, log it.
        if (!otpSent) {
            console.log(`OTP for ${normalizedPhone}: ${otp} (Telegram not available or user not linked)`);
            
            // Try to get bot username for helpful message
            let botInfo = '';
            let botUsername = 'ethiolivestock_bot';
            try {
                const { getBot } = require('../services/telegramBot');
                const bot = getBot();
                if (bot) {
                    const me = await bot.getMe();
                    botInfo = `@${me.username}`;
                    botUsername = me.username;
                }
            } catch (e) {
                console.warn('Could not get bot info (likely network issue):', e.message);
                botInfo = '@ethiolivestock_bot';
            }

            // In development mode, return OTP in response even if not linked
            // Also return OTP if Telegram connection failed (network issues)
            const isDevelopment = process.env.NODE_ENV === 'development';
            const telegramConnectionFailed = !botInfo || botInfo === '@ethiolivestock_bot';
            
            // Generate Telegram deep link for automatic linking
            let telegramDeepLink = null;
            try {
                const linkingToken = Array.from(linkingTokens.keys()).find(key => 
                    linkingTokens.get(key).phone === normalizedPhone
                );
                if (linkingToken) {
                    telegramDeepLink = `https://t.me/${botUsername}?start=link_${linkingToken}`;
                }
            } catch (e) {
                console.error('Error generating deep link:', e);
            }

            return sendSuccess(res, 200, 
                telegramConnectionFailed
                    ? 'OTP generated. Telegram connection unavailable - check console for OTP.'
                    : 'OTP generated. Please link your Telegram to receive OTP automatically.',
                {
                    message: telegramConnectionFailed
                        ? 'Telegram API connection failed. OTP generated but not sent via Telegram.'
                        : telegramDeepLink 
                            ? `Click the link below to automatically link your Telegram and receive OTP codes instantly!`
                            : 'OTP generated successfully',
                    otp: (isDevelopment || telegramConnectionFailed) ? otp : undefined, // Return OTP if dev mode or Telegram failed
                    telegram_linked: false,
                    telegram_connection_failed: telegramConnectionFailed,
                    telegram_deep_link: telegramDeepLink,
                    linking_token: telegramDeepLink ? telegramDeepLink.split('link_')[1] : null,
                    instructions: telegramConnectionFailed
                        ? `Network issue connecting to Telegram. OTP: ${otp} (check server console)`
                        : telegramDeepLink 
                            ? `Click this link to automatically link your Telegram: ${telegramDeepLink}`
                            : botInfo 
                                ? `For automatic OTP delivery, link your phone: Start ${botInfo} and send /link ${normalizedPhone}`
                                : 'Link your Telegram bot for automatic OTP delivery',
                    note: telegramConnectionFailed
                        ? '⚠️ Telegram API connection timeout. Please check your network connection or use the OTP shown in development mode.'
                        : telegramDeepLink 
                            ? 'After clicking the link, your phone will be linked and you\'ll receive the OTP automatically via Telegram!'
                            : 'Link your Telegram bot for automatic OTP delivery in the future',
                    is_new_user: isNewUser,
                    telegram_bot_username: botUsername
                }
            );
        }

        // Get bot username for response
        let botUsername = 'ethiolivestock_bot';
        try {
            const { getBot } = require('../services/telegramBot');
            const bot = getBot();
            if (bot) {
                const me = await bot.getMe();
                botUsername = me.username;
            }
        } catch (e) {
            console.error('Error getting bot info:', e);
        }

        return sendSuccess(res, 200, 'OTP sent to your Telegram', {
            message: 'Please check your Telegram for the OTP code',
            // In development, also return OTP for testing
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            telegram_linked: true,
            is_new_user: isNewUser,
            telegram_bot_username: botUsername
        });
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
        console.log('[OTP Verify] All stored phones:', Array.from(otpStore.keys()));

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
        console.log('[OTP Verify] Comparing OTP (string):', otpString, 'length:', otpString.length);
        const isValid = await verifyOTP(otpString, otpData.otpHash);
        console.log('[OTP Verify] OTP valid:', isValid);

        if (!isValid) {
            return sendError(res, 401, 'Invalid OTP');
        }

        // Remove OTP from store
        otpStore.delete(normalizedPhone);

        // Find or create user
        let user = await User.findOne({ where: { phone: normalizedPhone } });
        const isNewUser = !user; // Track if this is a new user BEFORE creating

        // If user doesn't exist, create a new Buyer account
        if (!user) {
            user = await User.create({
                role: 'Buyer',
                phone: normalizedPhone,
                email: null,
                password_hash: null,
                address: name || null // Store name in address field temporarily, or use metadata
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
                is_new_user: isNewUser // Use the isNewUser variable we calculated earlier
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
    otpStore,
    linkingTokens
};
