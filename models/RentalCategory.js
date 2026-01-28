const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RentalCategory = sequelize.define('rental_categories', {
    category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    name_am: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Amharic name'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Icon name for UI display'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true,
    underscored: true
});

module.exports = RentalCategory;
