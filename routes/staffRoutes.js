const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const staffController = require('../controllers/staffController');

// All staff routes require authentication
router.use(verifyToken);

// Self
router.get('/me/permissions', staffController.getMyPermissions);

// Staff roles — manage (require staff.manage permission, or Admin)
router.get('/roles', requirePermission('staff.manage'), staffController.listStaffRoles);
router.post('/roles', requirePermission('staff.manage'), staffController.createStaffRole);
router.put('/roles/:id', requirePermission('staff.manage'), staffController.updateStaffRole);
router.delete('/roles/:id', requirePermission('staff.manage'), staffController.deleteStaffRole);

// Staff members — manage
router.get('/members', requirePermission('staff.manage'), staffController.listStaffMembers);
router.post('/members', requirePermission('staff.manage'), staffController.createStaffMember);
router.put('/members/:id', requirePermission('staff.manage'), staffController.updateStaffMember);
router.delete('/members/:id', requirePermission('staff.manage'), staffController.deleteStaffMember);

module.exports = router;
