const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('payments', {
    payment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'orders',
            key: 'order_id'
        }
    },
    seller_payout_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'seller_payouts',
            key: 'payout_id'
        }
    },
    transaction_ref: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    gateway_used: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Legacy field - use payment_method instead'
    },
    payment_method: {
        type: DataTypes.ENUM('chapa', 'telebirr', 'screenshot', 'cash'),
        allowNull: false,
        defaultValue: 'screenshot',
        comment: 'Payment gateway or method used'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'),
        defaultValue: 'pending',
        comment: 'Current payment status'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'ETB',
        comment: 'Currency code (e.g., ETB)'
    },
    phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Phone number for Telebirr payments'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Email for Chapa payments'
    },
    checkout_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Payment gateway redirect URL'
    },
    gateway_reference: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Reference ID from payment gateway'
    },
    verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when payment was verified'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional gateway response data'
    },
    commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        comment: 'Commission percentage (e.g., 5.00 for 5%)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin notes or payment description'
    }
});

module.exports = Payment;
