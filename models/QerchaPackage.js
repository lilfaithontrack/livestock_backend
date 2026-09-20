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
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        comment: 'Total number of shares available (supports fractional shares e.g. 0.25, 0.5)'
    },
    shares_available: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        comment: 'Remaining shares available for purchase (supports fractional shares)'
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
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Human-readable location where the animal/package can be viewed or picked up'
    },
    delivery_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Free-text delivery / pickup instructions for buyers'
    },
    moderation_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Admin moderation status, separate from the Active/Completed/Cancelled lifecycle status'
    },
    admin_approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

module.exports = QerchaPackage;
