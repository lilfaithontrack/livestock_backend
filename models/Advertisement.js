const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Advertisement = sequelize.define('advertisements', {
    ad_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ad_type: {
        type: DataTypes.ENUM('banner', 'popup', 'text_slide'),
        allowNull: false,
        defaultValue: 'banner'
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    link_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    text_content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    position: {
        type: DataTypes.ENUM('top', 'bottom', 'sidebar', 'modal', 'slider'),
        allowNull: true,
        defaultValue: 'top'
    },
    priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    click_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    target_audience: {
        type: DataTypes.ENUM('all', 'buyers', 'sellers', 'agents'),
        allowNull: false,
        defaultValue: 'all'
    },
    background_color: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    text_color: {
        type: DataTypes.STRING(20),
        allowNull: true
    }
}, {
    tableName: 'advertisements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Advertisement;
