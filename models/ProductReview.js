const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/** Buyer review after a completed/delivered order (one per order + product). */
const ProductReview = sequelize.define('product_reviews', {
    review_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'products', key: 'product_id' }
    },
    seller_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        comment: 'Denormalized seller at time of review'
    },
    buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' }
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'orders', key: 'order_id' }
    },
    rating: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = ProductReview;
