const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('users', {
    user_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    role: {
        type: DataTypes.ENUM('Admin', 'Seller', 'Buyer', 'Agent'),
        allowNull: false,
        defaultValue: 'Buyer'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    kyc_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    trade_license_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to trade license document'
    },
    national_id_front_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to national ID or Kebele ID front side'
    },
    national_id_back_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to national ID or Kebele ID back side'
    },
    kyc_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when KYC documents were submitted'
    },
    kyc_reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when admin reviewed KYC documents'
    },
    kyc_rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for KYC rejection if applicable'
    },
    current_plan_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Current active seller plan'
    },
    plan_selected_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When seller selected their plan'
    },
    telegram_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Telegram user ID for receiving OTPs'
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash) {
                const salt = await bcrypt.genSalt(10);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash')) {
                const salt = await bcrypt.genSalt(10);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
            }
        }
    }
});

// Instance method to validate password
User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password_hash);
};

module.exports = User;
