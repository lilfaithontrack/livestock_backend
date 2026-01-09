const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCategory = sequelize.define('product_categories', {
    cat_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    slug: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true,
        comment: 'SEO-friendly URL slug'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Category banner/thumbnail image'
    },
    icon_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Category icon for navigation'
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Order for displaying categories in UI'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether category is active and visible'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional category-specific attributes'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['slug'], unique: true },
        { fields: ['is_active'] },
        { fields: ['display_order'] }
    ]
});

module.exports = ProductCategory;
