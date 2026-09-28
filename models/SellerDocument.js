const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * SellerDocument — supports multiple files per KYC document type.
 *
 * Replaces the legacy single-URL columns on `users`
 * (trade_license_url, tin_vat_url, national_id_front_url, national_id_back_url).
 * Those columns are kept for backward compatibility but new uploads go here.
 */
const SellerDocument = sequelize.define('seller_documents', {
    document_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    document_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            isIn: [['trade_license', 'tin_vat', 'national_id_front', 'national_id_back', 'other']]
        }
    },
    file_url: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    file_size: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'seller_documents',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'document_type'] }
    ]
});

module.exports = SellerDocument;
