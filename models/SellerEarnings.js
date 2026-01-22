const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerEarnings = sequelize.define('seller_earnings', {
    earning_id: {
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
    order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'order_id'
        }
    },
    order_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total order amount'
    },
    commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Commission percentage applied'
    },
    commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Commission deducted'
    },
    net_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount seller receives (order_amount - commission)'
    },
    status: {
        type: DataTypes.ENUM('pending', 'available', 'withdrawn', 'on_hold'),
        defaultValue: 'pending',
        comment: 'Earning status'
    },
    available_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When earnings become available for withdrawal'
    },
    payout_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'seller_payouts',
            key: 'payout_id'
        },
        comment: 'Linked payout if withdrawn'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['seller_id'] },
        { fields: ['order_id'] },
        { fields: ['status'] },
        { fields: ['available_date'] },
        { fields: ['payout_id'] }
    ]
});

module.exports = SellerEarnings;
