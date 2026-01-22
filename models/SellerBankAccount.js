const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerBankAccount = sequelize.define('seller_bank_accounts', {
    account_id: {
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
    bank_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Bank name (e.g., CBE, Awash, Telebirr)'
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
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Primary account for withdrawals'
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether account has been verified'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['seller_id'] },
        { fields: ['is_primary'] }
    ]
});

module.exports = SellerBankAccount;
