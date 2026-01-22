const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminBankAccount = sequelize.define('admin_bank_accounts', {
    account_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    bank_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Name of the bank (e.g., CBE, Awash, Telebirr)'
    },
    account_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Account holder name'
    },
    account_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Bank account number'
    },
    account_type: {
        type: DataTypes.ENUM('bank', 'mobile_money'),
        defaultValue: 'bank',
        comment: 'Type of account'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this account is currently accepting payments'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Primary account shown to sellers'
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Payment instructions for sellers'
    },
    logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Bank/payment method logo'
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Order in which to display accounts'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['is_active'] },
        { fields: ['is_primary'] },
        { fields: ['display_order'] }
    ]
});

module.exports = AdminBankAccount;
