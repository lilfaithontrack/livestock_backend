const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('orders', {
    order_id: {
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
        allowNull: false
    },
    payment_status: {
        type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
        defaultValue: 'Pending'
    },
    order_status: {
        type: DataTypes.ENUM('Placed', 'Paid', 'Approved', 'Assigned', 'In_Transit', 'Delivered', 'Cancelled'),
        defaultValue: 'Placed'
    },
    payment_proof_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to payment screenshot/proof image'
    },
    shipping_address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Full shipping address for the order'
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
        comment: 'Type of order - regular product purchase or qercha share purchase'
    },
    delivery_type: {
        type: DataTypes.ENUM('platform', 'seller', 'pickup'),
        defaultValue: 'platform',
        comment: 'Who handles delivery: platform agent, seller, or buyer pickup'
    },
    seller_can_deliver: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Seller opted to deliver this order'
    },
    qr_code: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Unique QR code for order verification'
    },
    qr_code_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hashed QR code for verification'
    },
    delivery_otp_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hashed OTP for delivery verification'
    },
    delivery_otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'OTP expiration timestamp'
    },
    assigned_agent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'Assigned delivery agent'
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When order was approved for delivery'
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'Admin who approved the order'
    },
    picked_up_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When agent picked up from seller'
    },
    delivered_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When order was delivered'
    },
    seller_location_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Seller pickup latitude'
    },
    seller_location_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Seller pickup longitude'
    },
    buyer_location_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Buyer delivery latitude'
    },
    buyer_location_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Buyer delivery longitude'
    }
});

module.exports = Order;
