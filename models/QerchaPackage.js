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
    }
});

module.exports = QerchaPackage;
