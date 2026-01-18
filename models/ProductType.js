const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductType = sequelize.define('product_types', {
    type_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Product type name (e.g., Livestock, Feed, Equipment)'
    },
    slug: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true,
        comment: 'SEO-friendly URL slug'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description of product type'
    },
    icon_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Icon URL for navigation menus'
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Banner/thumbnail image'
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Order for displaying types in UI'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether product type is active and visible'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional type-specific attributes (custom fields, filters, etc.)'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['slug'], unique: true },
        { fields: ['is_active'] },
        { fields: ['display_order'] }
    ],
    hooks: {
        beforeValidate: (productType) => {
            // Auto-generate slug from name if not provided
            if (!productType.slug && productType.name) {
                productType.slug = productType.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }
        }
    }
});

module.exports = ProductType;
