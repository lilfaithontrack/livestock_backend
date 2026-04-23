const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderGroup = sequelize.define('order_groups', {
    group_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Grand total across all seller sub-orders'
    },
    payment_status: {
        type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
        defaultValue: 'Pending'
    },
    payment_proof_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to payment screenshot/proof image for the group'
    },
    shipping_address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Full shipping address for the order group'
    },
    shipping_full_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Full name of the recipient'
    },
    shipping_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Contact phone for shipping'
    },
    shipping_city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'City for shipping'
    },
    shipping_region: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Region/State for shipping'
    },
    shipping_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional shipping notes or instructions'
    },
    order_type: {
        type: DataTypes.ENUM('regular', 'qercha'),
        defaultValue: 'regular',
        allowNull: false,
        comment: 'Type of order group'
    }
});

module.exports = OrderGroup;
