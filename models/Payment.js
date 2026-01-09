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
        allowNull: false,
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
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        comment: 'Commission percentage (e.g., 5.00 for 5%)'
    }
});

module.exports = Payment;
