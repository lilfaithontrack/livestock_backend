const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rental = sequelize.define('rentals', {
    rental_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'rental_categories',
            key: 'category_id'
        }
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    title_am: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Amharic title'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    description_am: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Amharic description'
    },
    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    price_unit: {
        type: DataTypes.STRING(20),
        defaultValue: 'per_day',
        comment: 'per_day, per_hour, per_week, per_month, per_event'
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ETB'
    },
    negotiable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Primary contact phone number for call button'
    },
    contact_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    whatsapp_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    telegram_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    location_am: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Amharic location'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    region: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: {
            min: -90,
            max: 90
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: {
            min: -180,
            max: 180
        }
    },
    image_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    video_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    specifications: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Flexible JSON for rental-type specific attributes'
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    available_from: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    available_until: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        comment: 'pending, approved, rejected, archived'
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
    },
    view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    contact_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Track call button clicks'
    },
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['owner_id'] },
        { fields: ['category_id'] },
        { fields: ['status'] },
        { fields: ['is_available'] },
        { fields: ['city'] },
        { fields: ['price'] },
        { fields: ['featured'] },
        { fields: ['created_at'] }
    ]
});

module.exports = Rental;
