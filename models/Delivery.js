const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('deliveries', {
    delivery_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'order_id'
        }
    },
    agent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    admin_assigned_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    start_location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    end_location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Assigned', 'In_Transit', 'Delivered', 'Failed', 'Cancelled'),
        defaultValue: 'Pending'
    },
    otp_code_hash: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Hashed OTP for delivery verification'
    },
    qr_code_hash: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Hashed QR code for delivery verification'
    },
    proof_of_delivery_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Photos, signatures, etc.'
    },
    otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    pickup_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When agent confirmed pickup from seller'
    },
    delivery_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When delivery was verified and completed'
    },
    verification_method: {
        type: DataTypes.ENUM('qr', 'otp'),
        allowNull: true,
        comment: 'How delivery was verified'
    },
    distance_km: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Calculated delivery distance in km'
    },
    estimated_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Estimated time of delivery'
    },
    actual_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Actual time of delivery'
    },
    delivery_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes from delivery agent'
    }
});

module.exports = Delivery;
