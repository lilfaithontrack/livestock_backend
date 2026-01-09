const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductSubcategory = sequelize.define('product_subcategories', {
    sub_cat_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    cat_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'product_categories',
            key: 'cat_id'
        }
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
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
        comment: 'Subcategory image'
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Order for displaying subcategories in UI'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether subcategory is active and visible'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional subcategory-specific filter attributes'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['cat_id'] },
        { fields: ['slug'], unique: true },
        { fields: ['is_active'] },
        { fields: ['display_order'] }
    ]
});

module.exports = ProductSubcategory;
