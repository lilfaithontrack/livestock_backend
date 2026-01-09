const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Butcher = sequelize.define('butchers', {
    butcher_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'City or region'
    },
    specialization: {
        type: DataTypes.ENUM('cattle', 'goat', 'sheep', 'all'),
        defaultValue: 'all',
        allowNull: false
    },
    experience_years: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    license_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
            max: 5
        }
    },
    total_services: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    }
}, {
    tableName: 'butchers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Butcher;
