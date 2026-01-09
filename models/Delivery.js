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
        type: DataTypes.ENUM('Pending', 'Assigned', 'In_Transit', 'Delivered', 'Failed'),
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
    }
});

module.exports = Delivery;
