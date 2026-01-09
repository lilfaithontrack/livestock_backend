const { getBot, sendWelcomeMessage, sendLinkConfirmation, sendErrorMessage } = require('./telegramBot');
const { TelegramMapping } = require('../models');

/**
 * Setup Telegram bot command handlers
 */
const setupBotHandlers = () => {
    const bot = getBot();
    if (!bot) {
        console.warn('Telegram bot not available, skipping handler setup');
        return;
    }

    // Handle /start command (with optional linking token)
    bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const telegramUserId = msg.from.id;
        const telegramUsername = msg.from.username || null;
        const username = msg.from.username || msg.from.first_name;
        const startParam = match ? match[1] : null;
        
        console.log(`Bot started by user ${username} (${chatId})`);
        
        // Check if this is an automatic linking request
        if (startParam && startParam.startsWith('link_')) {
            const linkingToken = startParam.replace('link_', '');
            
            // Check if linking token exists and is valid
            const { linkingTokens } = require('../controllers/authController');
            
            if (linkingTokens && linkingTokens.has(linkingToken)) {
                const tokenData = linkingTokens.get(linkingToken);
                
                // Check if token expired
                if (new Date() > new Date(tokenData.expiresAt)) {
                    await bot.sendMessage(chatId, 
                        '❌ This linking link has expired. Please request a new OTP from the app.'
                    );
                    linkingTokens.delete(linkingToken);
                    return;
                }
                
                const phone = tokenData.phone;
                const pendingOTP = tokenData.otp; // Get the pending OTP
                
                try {
                    // Auto-link the phone number to this Telegram account
                    const [mapping, created] = await TelegramMapping.findOrCreate({
                        where: { phone: phone },
                        defaults: {
                            telegram_user_id: telegramUserId,
                            telegram_username: telegramUsername,
                            is_verified: false
                        }
                    });
                    
                    if (!created) {
                        // Update existing mapping
                        await mapping.update({
                            telegram_user_id: telegramUserId,
                            telegram_username: telegramUsername
                        });
                    }
                    
                    // Delete used token
                    linkingTokens.delete(linkingToken);
                    
                    // Send the pending OTP immediately
                    if (pendingOTP) {
                        const { sendOTP } = require('./telegramBot');
                        await sendOTP(telegramUserId, pendingOTP, phone);
                        
                        await bot.sendMessage(chatId, 
                            `✅ *Phone Number Linked Successfully!*\n\n` +
                            `Your phone number ${phone} is now linked to this Telegram account.\n\n` +
                            `📱 *Your OTP code has been sent above!*\n\n` +
                            `You will now receive OTP codes automatically via Telegram for future logins.\n\n` +
                            `You can close this chat and return to the app.`,
                            { parse_mode: 'Markdown' }
                        );
                    } else {
                        await bot.sendMessage(chatId, 
                            `✅ *Phone Number Linked Successfully!*\n\n` +
                            `Your phone number ${phone} is now linked to this Telegram account.\n\n` +
                            `You will now receive OTP codes automatically via Telegram when you log in or register.\n\n` +
                            `You can close this chat and return to the app.`,
                            { parse_mode: 'Markdown' }
                        );
                    }
                    
                    console.log(`Auto-linked phone ${phone} to Telegram user ${telegramUserId}`);
                    
                    return;
                } catch (error) {
                    console.error('Error auto-linking phone:', error);
                    await bot.sendMessage(chatId, 
                        '❌ An error occurred while linking your phone number. Please try again.'
                    );
                    return;
                }
            } else {
                await bot.sendMessage(chatId, 
                    '❌ Invalid or expired linking link. Please request a new OTP from the app.'
                );
            }
        }
        
        // Regular /start command
        await sendWelcomeMessage(chatId);
    });

    // Handle /link command - Link phone number to Telegram account
    bot.onText(/\/link (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const telegramUserId = msg.from.id;
        const telegramUsername = msg.from.username || null;
        const phone = match[1].trim();

        console.log(`Link request from user ${telegramUserId} for phone: ${phone}`);

        // Validate phone number format (basic validation)
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone)) {
            await sendErrorMessage(chatId, 'Invalid phone number format. Please use format: +251912345678');
            return;
        }

        try {
            // Normalize phone number (remove spaces, ensure + prefix)
            const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

            // Check if phone already linked to another Telegram account
            const existingMapping = await TelegramMapping.findOne({
                where: { phone: normalizedPhone }
            });

            if (existingMapping && existingMapping.telegram_user_id !== telegramUserId) {
                await sendErrorMessage(chatId, 'This phone number is already linked to another Telegram account.');
                return;
            }

            // Check if Telegram account already linked to another phone
            const existingTelegramMapping = await TelegramMapping.findOne({
                where: { telegram_user_id: telegramUserId }
            });

            if (existingTelegramMapping && existingTelegramMapping.phone !== normalizedPhone) {
                // Update existing mapping
                await existingTelegramMapping.update({
                    phone: normalizedPhone,
                    telegram_username: telegramUsername,
                    is_verified: false
                });
                await sendLinkConfirmation(chatId, normalizedPhone);
                console.log(`Updated mapping: ${telegramUserId} -> ${normalizedPhone}`);
                return;
            }

            // Create or update mapping
            const [mapping, created] = await TelegramMapping.findOrCreate({
                where: { phone: normalizedPhone },
                defaults: {
                    telegram_user_id: telegramUserId,
                    telegram_username: telegramUsername,
                    is_verified: false
                }
            });

            if (!created) {
                // Update existing mapping
                await mapping.update({
                    telegram_user_id: telegramUserId,
                    telegram_username: telegramUsername
                });
            }

            await sendLinkConfirmation(chatId, normalizedPhone);
            console.log(`${created ? 'Created' : 'Updated'} mapping: ${telegramUserId} -> ${normalizedPhone}`);
        } catch (error) {
            console.error('Error linking phone number:', error);
            await sendErrorMessage(chatId, 'An error occurred while linking your phone number. Please try again.');
        }
    });

    // Handle any other text messages
    bot.on('message', async (msg) => {
        // Ignore commands (already handled)
        if (msg.text && msg.text.startsWith('/')) {
            return;
        }

        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, 
            'Please use /start to begin or /link <phone_number> to link your phone number.\n\n' +
            'Example: /link +251912345678'
        );
    });

    console.log('✓ Telegram bot handlers setup complete');
};

module.exports = { setupBotHandlers };

