const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TelegramMapping = sequelize.define('telegram_mappings', {
    mapping_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'User phone number'
    },
    telegram_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
        comment: 'Telegram user ID (chat_id)'
    },
    telegram_username: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Telegram username (optional)'
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the phone number has been verified'
    },
    last_otp_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time OTP was sent to this user'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['phone'], unique: true },
        { fields: ['telegram_user_id'], unique: true }
    ]
});

module.exports = TelegramMapping;

