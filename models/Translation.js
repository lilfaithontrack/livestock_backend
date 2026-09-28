const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Translation — a single (language_code, key, value) row.
 * Keys are namespaced strings like 'home.title', 'checkout.placeOrder'.
 */
const Translation = sequelize.define('translations', {
    translation_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    language_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        references: { model: 'languages', key: 'code' }
    },
    translation_key: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'translations',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['language_code', 'translation_key'], unique: true }
    ]
});

module.exports = Translation;
