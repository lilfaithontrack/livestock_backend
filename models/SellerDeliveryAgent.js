const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerDeliveryAgent = sequelize.define('seller_delivery_agents', {
    agent_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    seller_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'Seller who registered this delivery agent'
    },
    full_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Full name of delivery agent'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Phone number of delivery agent'
    },
    email: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    national_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'National ID number for verification'
    },
    vehicle_type: {
        type: DataTypes.ENUM('motorcycle', 'bicycle', 'car', 'truck', 'on_foot'),
        defaultValue: 'motorcycle',
        comment: 'Type of vehicle used for delivery'
    },
    vehicle_plate: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Vehicle plate number'
    },
    profile_photo_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether agent is active'
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether agent is currently available for deliveries'
    },
    current_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    current_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    total_deliveries: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 5.00
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['seller_id'] },
        { fields: ['is_active'] },
        { fields: ['is_available'] },
        { fields: ['phone'] }
    ]
});

module.exports = SellerDeliveryAgent;
