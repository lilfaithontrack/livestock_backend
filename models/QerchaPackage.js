const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QerchaPackage = sequelize.define('qercha_packages', {
    package_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ox_product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'product_id'
        }
    },
    total_shares: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Total number of shares available'
    },
    shares_available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Remaining shares available for purchase'
    },
    host_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    status: {
        type: DataTypes.ENUM('Active', 'Completed', 'Cancelled'),
        defaultValue: 'Active'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the package becomes available for participation'
    },
    expiry_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the package expires if not completed'
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Qercha-specific category (e.g. Cattle, Sheep, Goat, Camel)'
    },
    ethiopian_start_display: {
        type: DataTypes.STRING(120),
        allowNull: true,
        comment: 'Optional Ethiopian calendar label for start (e.g. መስከረም 5, 2017)'
    },
    ethiopian_expiry_display: {
        type: DataTypes.STRING(120),
        allowNull: true,
        comment: 'Optional Ethiopian calendar label for closing'
    },
    time_window_note: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Human-readable schedule note (local time window)'
    }
});

module.exports = QerchaPackage;
