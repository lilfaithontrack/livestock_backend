const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeliverySettings = sequelize.define('delivery_settings', {
    setting_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    setting_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    setting_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true,
    underscored: true
});

// Helper to get setting value
DeliverySettings.getSetting = async function(key, defaultValue = 0) {
    const setting = await this.findOne({ where: { setting_key: key, is_active: true } });
    return setting ? parseFloat(setting.setting_value) : defaultValue;
};

// Helper to get all settings as object
DeliverySettings.getAllSettings = async function() {
    const settings = await this.findAll({ where: { is_active: true } });
    return settings.reduce((acc, s) => {
        acc[s.setting_key] = parseFloat(s.setting_value);
        return acc;
    }, {});
};

module.exports = DeliverySettings;
