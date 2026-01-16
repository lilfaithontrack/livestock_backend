/**
 * Telegram OTP Service
 * Uses external PHP service at sms.shegergebeya.com to send OTPs via Telegram
 */

const axios = require('axios');

// Configuration
const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL || 'https://sms.shegergebeya.com/send-otp.php';
const SMS_API_SECRET = process.env.SMS_API_SECRET || 'your-secret-key-here';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'ethiolivestock_bot';

/**
 * Send OTP via external PHP service
 * @param {string} telegramUserId - Telegram user ID (chat_id)
 * @param {string} otp - OTP code to send
 * @param {string} phone - Phone number (for context)
 * @returns {Promise<boolean>} Success status
 */
const sendOTP = async (telegramUserId, otp, phone) => {
    try {
        console.log(`Sending OTP to Telegram user ${telegramUserId} via PHP service...`);

        const response = await axios.post(SMS_SERVICE_URL, {
            telegram_user_id: telegramUserId,
            otp: otp,
            phone: phone
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SMS_API_SECRET}`
            },
            timeout: 15000 // 15 second timeout
        });

        if (response.data && response.data.success) {
            console.log(`✓ OTP sent successfully to Telegram user ${telegramUserId}`);
            return true;
        } else {
            console.error('PHP SMS service returned error:', response.data?.message || 'Unknown error');
            return false;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            console.error(`⚠️ SMS service timeout for user ${telegramUserId}`);
        } else if (error.response) {
            console.error('SMS service error:', error.response.data?.message || error.response.statusText);
        } else {
            console.error('Error sending OTP via SMS service:', error.message);
        }
        return false;
    }
};

/**
 * Try to send OTP to user by phone number (automatic discovery)
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code to send
 * @returns {Promise<{success: boolean, method: string, userId?: number}>}
 */
const sendOTPByPhone = async (phone, otp) => {
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
        console.error('Error checking existing mapping:', error.message);
    }

    // Try sending to channel if configured
    const channelId = process.env.TELEGRAM_OTP_CHANNEL_ID;
    if (channelId) {
        try {
            const sent = await sendOTPViaChannel(phone, otp, channelId);
            if (sent) {
                return { success: true, method: 'public_channel', note: 'OTP posted to public channel' };
            }
        } catch (error) {
            console.error('Error sending OTP to channel:', error.message);
        }
    }

    return { success: false, method: 'phone_not_found', note: 'User not linked to Telegram' };
};

/**
 * Send OTP via public channel/group (alternative method)
 * @param {string} phone - Phone number (last 4 digits for privacy)
 * @param {string} otp - OTP code
 * @param {string} channelId - Telegram channel/group ID
 * @returns {Promise<boolean>}
 */
const sendOTPViaChannel = async (phone, otp, channelId) => {
    try {
        const response = await axios.post(SMS_SERVICE_URL, {
            channel_id: channelId,
            otp: otp,
            phone: phone
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SMS_API_SECRET}`
            },
            timeout: 15000
        });

        if (response.data && response.data.success) {
            console.log(`✓ OTP posted to channel for phone ending in ${phone.slice(-4)}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error sending OTP to channel:', error.message);
        return false;
    }
};

/**
 * Send welcome message - Not used with PHP service
 */
const sendWelcomeMessage = async (chatId) => {
    console.log('Welcome message would be sent to:', chatId);
    // This is handled by the bot handlers if needed
};

/**
 * Send link confirmation - Not used with PHP service
 */
const sendLinkConfirmation = async (chatId, phone) => {
    console.log('Link confirmation would be sent to:', chatId, 'for phone:', phone);
};

/**
 * Send error message - Not used with PHP service
 */
const sendErrorMessage = async (chatId, errorMessage) => {
    console.log('Error message would be sent to:', chatId, ':', errorMessage);
};

/**
 * Get bot instance - Returns null as we use external PHP service
 */
const getBot = () => null;

/**
 * Get bot username for deep links
 */
const getBotUsername = () => TELEGRAM_BOT_USERNAME;

module.exports = {
    sendOTP,
    sendOTPByPhone,
    sendOTPViaChannel,
    sendWelcomeMessage,
    sendLinkConfirmation,
    sendErrorMessage,
    getBot,
    getBotUsername
};
