const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * StaffRole — a defined role for admin-panel staff (SuperAdmin, Manager,
 * Moderator, Support, Finance, ...). Each role carries a JSONB `permissions`
 * array of permission strings (e.g. 'users.edit', 'products.approve').
 * The wildcard '*' means full access.
 *
 * A User is linked to a StaffRole via `users.staff_role_id`; per-user
 * overrides can be stored in `users.permissions`.
 */
const StaffRole = sequelize.define('staff_roles', {
    staff_role_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'System roles cannot be deleted (only their permissions edited)'
    }
}, {
    tableName: 'staff_roles',
    timestamps: true,
    underscored: true
});

module.exports = StaffRole;
