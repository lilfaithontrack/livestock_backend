const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgentPayout = sequelize.define('agent_payouts', {
    payout_id: {
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
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Withdrawal amount requested'
    },
    bank_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Agent bank name for payout'
    },
    account_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Agent account holder name'
    },
    account_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Agent bank account number'
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Processing', 'Completed', 'Rejected'),
        defaultValue: 'Pending',
        comment: 'Withdrawal request status'
    },
    request_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'When withdrawal was requested'
    },
    processed_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When withdrawal was processed'
    },
    processed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'Admin who processed the withdrawal'
    },
    payment_proof_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Admin uploads proof of payment to agent'
    },
    transaction_reference: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Bank transaction reference'
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason if withdrawal is rejected'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['agent_id'] },
        { fields: ['status'] },
        { fields: ['request_date'] },
        { fields: ['processed_by'] }
    ]
});

module.exports = AgentPayout;
