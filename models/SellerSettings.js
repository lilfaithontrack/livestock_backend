const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerSettings = sequelize.define('seller_settings', {
    setting_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    seller_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    // Delivery Preferences
    can_self_deliver: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Seller can deliver their own orders'
    },
    auto_accept_delivery: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Automatically accept delivery assignments'
    },
    preferred_delivery_radius_km: {
        type: DataTypes.DECIMAL(6, 2),
        defaultValue: 10.00,
        comment: 'Maximum delivery radius in km'
    },
    delivery_fee_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        comment: 'Additional delivery fee percentage'
    },
    // Notification Preferences
    notify_new_orders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notify_delivery_assigned: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notify_delivery_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // Business Hours
    business_hours: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Operating hours for deliveries'
    },
    // Delivery Agent Management
    preferred_agents: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'List of preferred delivery agent IDs'
    },
    blocked_agents: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'List of blocked agent IDs'
    }
}, {
    timestamps: true,
    underscored: true
});

module.exports = SellerSettings;
