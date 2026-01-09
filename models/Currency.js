const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Currency = sequelize.define('currencies', {
    currency_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true,
        comment: 'Currency code (e.g., ETB, USD, EUR)'
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Currency name (e.g., Ethiopian Birr, US Dollar)'
    },
    symbol: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Currency symbol (e.g., ብር, $, €)'
    },
    exchange_rate_to_usd: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 1.0000,
        validate: {
            min: 0.0001
        },
        comment: 'Exchange rate to USD (1 unit of this currency = X USD)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this currency is currently active for use'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is the default currency for the platform'
    },
    decimal_places: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
        validate: {
            min: 0,
            max: 4
        },
        comment: 'Number of decimal places for this currency'
    },
    last_updated: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the exchange rate was last updated'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['code'], unique: true },
        { fields: ['is_active'] },
        { fields: ['is_default'] }
    ]
});

module.exports = Currency;
