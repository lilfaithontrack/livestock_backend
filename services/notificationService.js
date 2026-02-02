
const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const User = require('../models/User');

const expo = new Expo();

const notificationService = {
    /**
     * Send a notification to a user
     * @param {string} userId - UUID of the user
     * @param {string} title - Notification title
     * @param {string} message - Notification body
     * @param {object} data - Optional data payload
     * @param {string} type - 'order', 'promo', 'system', 'delivery'
     */
    sendNotification: async (userId, title, message, data = {}, type = 'system') => {
        try {
            // 1. Save to Database
            await Notification.create({
                user_id: userId,
                title,
                message,
                type,
                data
            });

            // 2. Fetch User's Push Token
            const user = await User.findByPk(userId);
            if (!user || !user.push_token) {
                console.log(`[Notification] User ${userId} has no push token`);
                return;
            }

            const pushToken = user.push_token;

            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`[Notification] Push token ${pushToken} is not a valid Expo push token`);
                return;
            }

            // 3. Construct Message
            const messages = [{
                to: pushToken,
                sound: 'default',
                title: title,
                body: message,
                data: { ...data, type },
                priority: 'high'
            }];

            // 4. Send via Expo
            const chunks = expo.chunkPushNotifications(messages);
            const tickets = [];

            for (let chunk of chunks) {
                try {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error('[Notification] Error sending chunks', error);
                }
            }

            // Optional: Process tickets to check for errors immediately (simplified here)
            // console.log('[Notification] Tickets:', tickets);

        } catch (error) {
            console.error('[Notification] Error sending notification:', error);
        }
    },

    /**
     * Send broadcast to all users (e.g. for promos)
     */
    broadcast: async (title, message, data = {}, type = 'promo') => {
        // Implementation for later: Iterate all users with tokens
    }
};

module.exports = notificationService;
