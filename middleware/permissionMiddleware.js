/**
 * Permission helpers for staff / admin panel.
 *
 * Permissions are strings like 'users.edit', 'products.approve', 'payouts.process'.
 * The wildcard '*' (stored on the SuperAdmin role) grants every permission.
 *
 * Effective permissions for a user = staff_role.permissions ∪ user.permissions.
 */
const { User, StaffRole } = require('../models');

/**
 * Compute the effective permission list for a user.
 * Returns ['*'] for superadmins, otherwise a deduped string[].
 */
const getEffectivePermissions = async (userId) => {
    const user = await User.findByPk(userId, {
        include: [{ model: StaffRole, as: 'staff_role' }],
        attributes: ['user_id', 'role', 'permissions', 'staff_role_id']
    });
    if (!user) return [];

    // Admins without a staff role get full access by default.
    if (user.role === 'Admin' && !user.staff_role_id) return ['*'];

    const rolePerms = (user.staff_role && Array.isArray(user.staff_role.permissions)) ? user.staff_role.permissions : [];
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
    const merged = Array.from(new Set([...rolePerms, ...userPerms]));
    return merged;
};

/**
 * Express middleware factory: requirePermission('users.edit').
 * Verifies the caller has the given permission (or '*').
 * Must run after verifyToken.
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.user_id) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }
            const user = await User.findByPk(req.user.user_id, {
                include: [{ model: StaffRole, as: 'staff_role' }],
                attributes: ['user_id', 'role', 'is_active', 'permissions', 'staff_role_id']
            });
            if (!user || !user.is_active) {
                return res.status(403).json({ success: false, message: 'Account inactive or not found' });
            }
            // Only Admin and Staff roles may use panel permissions
            if (user.role !== 'Admin' && user.role !== 'Staff') {
                return res.status(403).json({ success: false, message: 'Panel access required' });
            }

            const rolePerms = (user.staff_role && Array.isArray(user.staff_role.permissions)) ? user.staff_role.permissions : [];
            const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
            const effective = Array.from(new Set([...rolePerms, ...userPerms]));

            if (effective.includes('*') || effective.includes(permission)) {
                // Attach for downstream handlers
                req.userPermissions = effective;
                return next();
            }
            return res.status(403).json({ success: false, message: `Missing permission: ${permission}` });
        } catch (err) {
            next(err);
        }
    };
};

module.exports = { getEffectivePermissions, requirePermission };
