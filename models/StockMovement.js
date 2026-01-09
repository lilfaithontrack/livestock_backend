const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockMovement = sequelize.define('stock_movements', {
    movement_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'product_id'
        },
        onDelete: 'CASCADE'
    },
    movement_type: {
        type: DataTypes.ENUM(
            'sale',              // Stock sold through order
            'restock',           // Stock added by seller
            'adjustment',        // Manual adjustment by admin
            'return',            // Product returned, stock added back
            'reservation',       // Stock reserved for pending order
            'reservation_release' // Reserved stock released (order cancelled)
        ),
        allowNull: false,
        comment: 'Type of stock movement'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Positive for additions, negative for reductions'
    },
    previous_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Stock quantity before this movement'
    },
    new_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Stock quantity after this movement'
    },
    reference_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of related entity (order_id, etc.)'
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type of reference (order, manual, etc.)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes about this movement'
    },
    performed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        onDelete: 'SET NULL',
        comment: 'User who performed this action'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['movement_type'] },
        { fields: ['created_at'] },
        { fields: ['reference_id'] },
        { fields: ['performed_by'] }
    ]
});

module.exports = StockMovement;
