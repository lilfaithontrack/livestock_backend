const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgentEarnings = sequelize.define('agent_earnings', {
    earning_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    agent_id: {
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
    delivery_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'deliveries',
            key: 'delivery_id'
        }
    },
    delivery_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total delivery fee charged'
    },
    platform_commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15,
        comment: 'Platform commission percentage'
    },
    platform_commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Platform commission amount'
    },
    net_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount agent receives (delivery_fee - platform_commission)'
    },
    distance_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Delivery distance in kilometers'
    },
    base_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Base delivery fee'
    },
    per_km_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Rate per kilometer'
    },
    bonus_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Any bonus for this delivery'
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
            model: 'agent_payouts',
            key: 'payout_id'
        },
        comment: 'Linked payout if withdrawn'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['agent_id'] },
        { fields: ['order_id'] },
        { fields: ['delivery_id'] },
        { fields: ['status'] },
        { fields: ['available_date'] },
        { fields: ['payout_id'] }
    ]
});

module.exports = AgentEarnings;
