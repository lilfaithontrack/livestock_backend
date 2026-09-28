const { User, StaffRole } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');
const { getEffectivePermissions } = require('../middleware/permissionMiddleware');

/**
 * Staff management controller.
 * Only Admin (or Staff with the 'staff.manage' permission) can manage staff.
 */

// ---- Staff Roles ----

/**
 * List all staff roles
 * GET /api/v1/staff/roles
 */
const listStaffRoles = async (req, res, next) => {
    try {
        const roles = await StaffRole.findAll({
            order: [['is_system', 'DESC'], ['name', 'ASC']],
            include: [{ model: User, as: 'staff_users', attributes: ['user_id', 'full_name', 'email', 'phone', 'is_active'], through: { attributes: [] } }]
        });
        return sendSuccess(res, 200, 'Staff roles retrieved', { roles });
    } catch (e) { next(e); }
};

/**
 * Create a custom staff role
 * POST /api/v1/staff/roles
 */
const createStaffRole = async (req, res, next) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name || !Array.isArray(permissions)) {
            return sendError(res, 400, 'name and permissions[] are required');
        }
        const role = await StaffRole.create({ name, description: description || null, permissions, is_system: false });
        return sendSuccess(res, 201, 'Staff role created', { role });
    } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
            return sendError(res, 409, 'A role with that name already exists');
        }
        next(e);
    }
};

/**
 * Update a staff role (system roles can have permissions edited but not deleted)
 * PUT /api/v1/staff/roles/:id
 */
const updateStaffRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const role = await StaffRole.findByPk(id);
        if (!role) return sendError(res, 404, 'Staff role not found');

        if (name !== undefined && role.is_system && name !== role.name) {
            return sendError(res, 400, 'System role names cannot be changed');
        }
        if (name !== undefined) role.name = name;
        if (description !== undefined) role.description = description;
        if (Array.isArray(permissions)) role.permissions = permissions;
        await role.save();
        return sendSuccess(res, 200, 'Staff role updated', { role });
    } catch (e) { next(e); }
};

/**
 * Delete a custom staff role (system roles are protected)
 * DELETE /api/v1/staff/roles/:id
 */
const deleteStaffRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const role = await StaffRole.findByPk(id);
        if (!role) return sendError(res, 404, 'Staff role not found');
        if (role.is_system) return sendError(res, 400, 'System roles cannot be deleted');

        const assigned = await User.count({ where: { staff_role_id: id } });
        if (assigned > 0) return sendError(res, 400, `${assigned} user(s) are still assigned to this role. Reassign them first.`);

        await role.destroy();
        return sendSuccess(res, 200, 'Staff role deleted');
    } catch (e) { next(e); }
};

// ---- Staff Members ----

/**
 * List staff members (Admin and Staff role users)
 * GET /api/v1/staff/members
 */
const listStaffMembers = async (req, res, next) => {
    try {
        const members = await User.findAll({
            where: { role: ['Admin', 'Staff'] },
            attributes: ['user_id', 'full_name', 'email', 'phone', 'role', 'is_active', 'last_login_at', 'staff_role_id', 'permissions', 'created_at'],
            include: [{ model: StaffRole, as: 'staff_role', attributes: ['staff_role_id', 'name', 'permissions'] }],
            order: [['created_at', 'DESC']]
        });
        return sendSuccess(res, 200, 'Staff members retrieved', { members });
    } catch (e) { next(e); }
};

/**
 * Create a new staff account
 * POST /api/v1/staff/members
 */
const createStaffMember = async (req, res, next) => {
    try {
        const { full_name, email, phone, password, role, staff_role_id, permissions } = req.body;
        if (!full_name || !password) {
            return sendError(res, 400, 'full_name and password are required');
        }
        if (role && !['Admin', 'Staff'].includes(role)) {
            return sendError(res, 400, 'role must be Admin or Staff');
        }
        if (email) {
            const exists = await User.findOne({ where: { email } });
            if (exists) return sendError(res, 409, 'Email already in use');
        }
        if (phone) {
            const exists = await User.findOne({ where: { phone } });
            if (exists) return sendError(res, 409, 'Phone already in use');
        }

        const user = await User.create({
            full_name,
            email: email || null,
            phone: phone || null,
            password_hash: password, // hashed by the model hook
            role: role || 'Staff',
            staff_role_id: staff_role_id || null,
            permissions: Array.isArray(permissions) ? permissions : [],
            is_active: true,
        });

        const effective = await getEffectivePermissions(user.user_id);
        return sendSuccess(res, 201, 'Staff member created', {
            user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role,
            staff_role_id: user.staff_role_id, permissions: user.permissions, effective_permissions: effective
        });
    } catch (e) { next(e); }
};

/**
 * Update a staff member (role, staff_role_id, permissions, is_active, password)
 * PUT /api/v1/staff/members/:id
 */
const updateStaffMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, staff_role_id, permissions, is_active, password, full_name, email, phone } = req.body;
        const user = await User.findByPk(id);
        if (!user) return sendError(res, 404, 'User not found');
        if (user.role !== 'Admin' && user.role !== 'Staff' && role === undefined) {
            return sendError(res, 400, 'Target user is not a staff member');
        }

        // Prevent self-lockout: a user cannot deactivate or demote themselves
        if (req.user && req.user.user_id === id) {
            if (is_active === false) return sendError(res, 400, 'You cannot deactivate your own account');
            if (role && role !== 'Admin' && role !== 'Staff') return sendError(res, 400, 'You cannot demote yourself out of staff');
        }

        if (role !== undefined) {
            if (!['Admin', 'Staff'].includes(role)) return sendError(res, 400, 'role must be Admin or Staff');
            user.role = role;
        }
        if (staff_role_id !== undefined) user.staff_role_id = staff_role_id || null;
        if (Array.isArray(permissions)) user.permissions = permissions;
        if (typeof is_active === 'boolean') user.is_active = is_active;
        if (full_name !== undefined) user.full_name = full_name;
        if (email !== undefined) user.email = email || null;
        if (phone !== undefined) user.phone = phone || null;
        if (password) {
            user.password_hash = password; // hashed by the model hook
        }
        await user.save();

        const effective = await getEffectivePermissions(user.user_id);
        return sendSuccess(res, 200, 'Staff member updated', {
            user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role,
            staff_role_id: user.staff_role_id, permissions: user.permissions, is_active: user.is_active,
            effective_permissions: effective
        });
    } catch (e) { next(e); }
};

/**
 * Delete a staff member (sets role back to Buyer — soft delete to preserve audit trail)
 * DELETE /api/vaff/members/:id
 */
const deleteStaffMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return sendError(res, 404, 'User not found');
        if (req.user && req.user.user_id === id) {
            return sendError(res, 400, 'You cannot delete your own staff account');
        }
        user.role = 'Buyer';
        user.staff_role_id = null;
        user.permissions = [];
        await user.save();
        return sendSuccess(res, 200, 'Staff access revoked. Account converted to Buyer.');
    } catch (e) { next(e); }
};

/**
 * Get the effective permissions of the currently logged-in staff/admin user
 * GET /api/v1/staff/me/permissions
 */
const getMyPermissions = async (req, res, next) => {
    try {
        if (!req.user || !req.user.user_id) return sendError(res, 401, 'Authentication required');
        const perms = await getEffectivePermissions(req.user.user_id);
        const user = await User.findByPk(req.user.user_id, {
            attributes: ['user_id', 'full_name', 'email', 'role', 'is_active', 'staff_role_id'],
            include: [{ model: StaffRole, as: 'staff_role', attributes: ['staff_role_id', 'name', 'permissions'] }]
        });
        return sendSuccess(res, 200, 'Permissions retrieved', { user, permissions: perms });
    } catch (e) { next(e); }
};

module.exports = {
    listStaffRoles,
    createStaffRole,
    updateStaffRole,
    deleteStaffRole,
    listStaffMembers,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    getMyPermissions,
};
