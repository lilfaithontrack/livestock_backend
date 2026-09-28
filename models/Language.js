const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Language — an enabled UI language (e.g. en, am).
 * `direction` is 'ltr' or 'rtl' for future Arabic support.
 */
const Language = sequelize.define('languages', {
    code: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    native_name: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    direction: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'ltr',
        validate: { isIn: [['ltr', 'rtl']] }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'languages',
    timestamps: true,
    underscored: true
});

module.exports = Language;
