const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerPlan = sequelize.define('seller_plans', {
    plan_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    seller_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    plan_type: {
        type: DataTypes.ENUM('commission', 'subscription'),
        allowNull: false,
        comment: 'Type of plan: commission-based or subscription-based'
    },
    plan_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Plan tier name: Basic, Gold, Premium, or custom name'
    },
    commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
            min: 0,
            max: 100
        },
        comment: 'Commission percentage per sale (only for commission plan)'
    },
    subscription_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        },
        comment: 'Monthly subscription fee (only for subscription plan)'
    },
    max_products: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        },
        comment: 'Maximum number of products allowed (only for subscription plan)'
    },
    subscription_start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Start date of subscription period'
    },
    subscription_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'End date of subscription period'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the plan is currently active'
    },
    auto_renew: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Auto-renew subscription at end of period'
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'expired'),
        defaultValue: 'pending',
        comment: 'Payment status for subscription plans'
    },
    payment_reference: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Payment transaction reference'
    },
    payment_proof_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to payment proof document'
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'Admin who approved the plan'
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when plan was approved'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes or comments'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['seller_id'] },
        { fields: ['plan_type'] },
        { fields: ['is_active'] },
        { fields: ['payment_status'] },
        { fields: ['subscription_end_date'] }
    ]
});

module.exports = SellerPlan;
