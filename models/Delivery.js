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
    },
    seller_assigned_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'Seller who assigned this delivery'
    },
    assignment_type: {
        type: DataTypes.ENUM('admin', 'seller', 'auto'),
        defaultValue: 'admin',
        comment: 'Who assigned the delivery'
    },
    seller_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes from seller about delivery'
    },
    pickup_location: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Seller location for pickup {lat, lng, address}'
    },
    delivery_location: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Buyer location for delivery {lat, lng, address}'
    },
    estimated_pickup_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    actual_pickup_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    delivery_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 }
    },
    delivery_feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Delivery;
