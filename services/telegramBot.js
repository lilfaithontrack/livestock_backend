const TelegramBot = require('node-telegram-bot-api');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Telegram bot features will be disabled.');
}

let bot = null;
if (token) {
    // Use polling for development, webhook for production
    const useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true';
    
    try {
        if (useWebhook) {
            bot = new TelegramBot(token);
            bot.setWebHook(`${process.env.TELEGRAM_WEBHOOK_URL}/bot${token}`);
            console.log('✓ Telegram bot initialized with webhook');
        } else {
            // Use polling with error handling
            bot = new TelegramBot(token, { 
                polling: {
                    interval: 1000,
                    autoStart: true,
                    params: {
                        timeout: 10
                    }
                }
            });
            
            // Handle polling errors gracefully
            bot.on('polling_error', (error) => {
                console.error('⚠️ Telegram polling error:', error.message);
                // Don't crash on polling errors - bot can still send messages
                if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT') {
                    console.warn('⚠️ Telegram API connection issue. Bot will continue but may have limited functionality.');
                }
            });
            
            console.log('✓ Telegram bot initialized with polling');
        }
    } catch (error) {
        console.error('✗ Failed to initialize Telegram bot:', error.message);
        console.warn('⚠️  Bot features will be disabled. OTP will be returned in response.');
        bot = null;
    }
} else {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Telegram bot features will be disabled.');
}

/**
 * Send OTP to user via Telegram by user ID
 * @param {string} telegramUserId - Telegram user ID (chat_id)
 * @param {string} otp - OTP code to send
 * @param {string} phone - Phone number (for context)
 * @returns {Promise<boolean>} Success status
 */
const sendOTP = async (telegramUserId, otp, phone) => {
    if (!bot) {
        console.error('Telegram bot not initialized');
        return false;
    }

    try {
        const message = `🔐 *OTP Verification*\n\n` +
            `Your verification code is: *${otp}*\n\n` +
            `Phone: ${phone}\n` +
            `This code will expire in 10 minutes.\n\n` +
            `⚠️ Do not share this code with anyone.`;

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Telegram API timeout')), 10000); // 10 second timeout
        });

        await Promise.race([
            bot.sendMessage(telegramUserId, message, {
                parse_mode: 'Markdown'
            }),
            timeoutPromise
        ]);
        
        console.log(`✓ OTP sent to Telegram user ${telegramUserId} for phone ${phone}`);
        return true;
    } catch (error) {
        // Handle timeout and connection errors gracefully
        if (error.code === 'ETIMEDOUT' || error.message === 'Telegram API timeout' || error.cause?.code === 'ETIMEDOUT') {
            console.warn(`⚠️ Telegram API connection timeout for user ${telegramUserId}. OTP: ${otp}`);
            console.warn('This may be due to network issues or Telegram API being blocked.');
        } else if (error.response?.body?.error_code === 403) {
            console.error(`User ${telegramUserId} has blocked the bot or chat not found`);
        } else {
            console.error('Error sending OTP via Telegram:', error.message || error);
        }
        return false;
    }
};

/**
 * Try to send OTP to user by phone number (automatic discovery)
 * This attempts to find the user by phone number and send OTP
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code to send
 * @returns {Promise<{success: boolean, method: string, userId?: number}>}
 */
const sendOTPByPhone = async (phone, otp) => {
    if (!bot) {
        return { success: false, method: 'bot_not_initialized' };
    }

    // Method 1: Try to find user by phone number in existing mappings
    try {
        const { TelegramMapping } = require('../models');
        const mapping = await TelegramMapping.findOne({
            where: { phone: phone }
        });

        if (mapping && mapping.telegram_user_id) {
            const sent = await sendOTP(mapping.telegram_user_id, otp, phone);
            if (sent) {
                await mapping.update({ last_otp_sent_at: new Date() });
                return { success: true, method: 'existing_mapping', userId: mapping.telegram_user_id };
            }
        }
    } catch (error) {
        console.error('Error checking existing mapping:', error);
    }

    // Method 2: Post to public Telegram channel (works for all users automatically)
    // This is the automatic method - users join the channel to receive OTPs
    const channelId = process.env.TELEGRAM_OTP_CHANNEL_ID;
    if (channelId) {
        try {
            const sent = await sendOTPViaChannel(phone, otp, channelId);
            if (sent) {
                return { success: true, method: 'public_channel', note: 'OTP posted to public channel' };
            }
        } catch (error) {
            console.error('Error sending OTP to channel:', error);
        }
    }
    
    // Method 3: Try to find user if they've interacted with bot before
    // Note: Telegram Bot API doesn't support messaging by phone number directly
    // This would only work if user has shared their contact with the bot
    
    return { success: false, method: 'phone_not_found', note: 'Use public channel or link phone first' };
};

/**
 * Send OTP via public channel/group (alternative method)
 * This posts OTP to a public channel where users can see it
 * Less secure but works without linking
 * @param {string} phone - Phone number (last 4 digits for privacy)
 * @param {string} otp - OTP code
 * @param {string} channelId - Telegram channel/group ID
 * @returns {Promise<boolean>}
 */
const sendOTPViaChannel = async (phone, otp, channelId) => {
    if (!bot) return false;

    try {
        const last4Digits = phone.slice(-4);
        const message = `🔐 *OTP for phone ending in *${last4Digits}*\n\n` +
            `Code: *${otp}*\n\n` +
            `⚠️ This code expires in 10 minutes.`;

        await bot.sendMessage(channelId, message, {
            parse_mode: 'Markdown'
        });
        
        console.log(`✓ OTP posted to channel for phone ending in ${last4Digits}`);
        return true;
    } catch (error) {
        console.error('Error sending OTP to channel:', error);
        return false;
    }
};

/**
 * Send welcome message when user starts the bot
 * @param {number} chatId - Telegram chat ID
 * @returns {Promise<void>}
 */
const sendWelcomeMessage = async (chatId) => {
    if (!bot) return;

    try {
        const message = `👋 *Welcome to Livestock Platform Bot!*\n\n` +
            `This bot will send you OTP codes for login and registration.\n\n` +
            `To link your phone number, send:\n` +
            `/link <your_phone_number>\n\n` +
            `Example: /link +251912345678\n\n` +
            `⚠️ Make sure to use the same phone number you use on the platform.`;

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
};

/**
 * Send confirmation when phone is linked
 * @param {number} chatId - Telegram chat ID
 * @param {string} phone - Phone number
 * @returns {Promise<void>}
 */
const sendLinkConfirmation = async (chatId, phone) => {
    if (!bot) return;

    try {
        const message = `✅ *Phone Number Linked!*\n\n` +
            `Your phone number ${phone} has been successfully linked to this Telegram account.\n\n` +
            `You will now receive OTP codes here for login and registration.`;

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending link confirmation:', error);
    }
};

/**
 * Send error message
 * @param {number} chatId - Telegram chat ID
 * @param {string} errorMessage - Error message
 * @returns {Promise<void>}
 */
const sendErrorMessage = async (chatId, errorMessage) => {
    if (!bot) return;

    try {
        await bot.sendMessage(chatId, `❌ Error: ${errorMessage}`);
    } catch (error) {
        console.error('Error sending error message:', error);
    }
};

/**
 * Get bot instance (for setting up handlers)
 * @returns {TelegramBot|null}
 */
const getBot = () => bot;

module.exports = {
    sendOTP,
    sendOTPByPhone,
    sendOTPViaChannel,
    sendWelcomeMessage,
    sendLinkConfirmation,
    sendErrorMessage,
    getBot
};

