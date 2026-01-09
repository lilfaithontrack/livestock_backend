const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerPayout = sequelize.define('seller_payouts', {
    payout_id: {
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
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payout_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Processed', 'Failed'),
        defaultValue: 'Pending'
    }
});

module.exports = SellerPayout;
