const { getBot, sendOTP } = require('./telegramBot');
const { TelegramMapping } = require('../models');

/**
 * Setup Telegram bot command handlers
 * Note: With PHP-based OTP service, bot polling is disabled.
 * This setup is a placeholder for future webhook-based bot commands.
 */
const setupBotHandlers = () => {
    const bot = getBot();
    if (!bot) {
        console.log('✓ Telegram OTP service configured (using external PHP service)');
        console.log('   OTPs will be sent via: ' + (process.env.SMS_SERVICE_URL || 'https://sms.shegergebeya.com/send-otp.php'));
        return;
    }

    // For future use: if you want to run bot commands locally
    console.log('✓ Telegram bot handlers would be setup here');
};

module.exports = { setupBotHandlers };
