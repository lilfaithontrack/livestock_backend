
const Notification = require('../models/Notification');
const User = require('../models/User');

const notificationController = {
    // Get all notifications for the authenticated user
    getNotifications: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const notifications = await Notification.findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']],
                limit: 50
            });

            // Format time for frontend if needed, or send raw date
            const formatted = notifications.map(n => ({
                id: n.notification_id,
                title: n.title,
                message: n.message,
                type: n.type,
                read: n.is_read,
                created_at: n.createdAt,
                data: n.data
            }));

            res.json({
                success: true,
                data: formatted
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }
    },

    // Mark a notification as read
    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.user_id;

            const notification = await Notification.findOne({
                where: { notification_id: id, user_id: userId }
            });

            if (!notification) {
                return res.status(404).json({ success: false, message: 'Notification not found' });
            }

            notification.is_read = true;
            await notification.save();

            res.json({ success: true, message: 'Marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error updating notification' });
        }
    },

    // Mark all as read
    markAllAsRead: async (req, res) => {
        try {
            const userId = req.user.user_id;
            await Notification.update(
                { is_read: true },
                { where: { user_id: userId, is_read: false } }
            );
            res.json({ success: true, message: 'All marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error updating notifications' });
        }
    },

    // Register push token
    registerPushToken: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ success: false, message: 'Token is required' });
            }

            await User.update(
                { push_token: token },
                { where: { user_id: userId } }
            );

            res.json({ success: true, message: 'Push token registered' });
        } catch (error) {
            console.error('Register token error:', error);
            res.status(500).json({ success: false, message: 'Failed to register token' });
        }
    }
};

module.exports = notificationController;
