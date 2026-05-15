const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ==================== STATIC / SPECIFIC PATHS FIRST ====================
// IMPORTANT: Express matches routes top-to-bottom.
// All fixed-segment paths must come before /:id or /:catId parameterized routes.

// ── Subcategory static paths ──────────────────────────────────────────────

// GET subcategory schema (must be before /subcategories/:id)
router.get('/subcategories/:id/schema', categoryController.getSubcategorySchema);

// PUT subcategory schema (must be before /subcategories/:id)
router.put(
    '/subcategories/:id/schema',
    verifyToken,
    requireRole(['Admin']),
    categoryController.updateSubcategorySchema
);

// Bulk reorder subcategories (must be before /subcategories/:id)
router.put(
    '/subcategories/bulk/reorder',
    verifyToken,
    requireRole(['Admin']),
    categoryController.reorderSubcategories
);

// GET subcategory by ID
router.get('/subcategories/:id', categoryController.getSubcategoryById);

// POST create subcategory
router.post(
    '/subcategories',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5),
    categoryController.createSubcategory
);

// PUT update subcategory
router.put(
    '/subcategories/:id',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5),
    categoryController.updateSubcategory
);

// DELETE subcategory
router.delete(
    '/subcategories/:id',
    verifyToken,
    requireRole(['Admin']),
    categoryController.deleteSubcategory
);

// ── Category static paths ─────────────────────────────────────────────────

// GET category statistics (must be before /:id)
router.get(
    '/admin/statistics',
    verifyToken,
    requireRole(['Admin']),
    categoryController.getCategoryStatistics
);

// Bulk reorder categories (must be before /:id)
router.put(
    '/bulk/reorder',
    verifyToken,
    requireRole(['Admin']),
    categoryController.reorderCategories
);

// ==================== PARAMETERIZED ROUTES LAST ====================

// GET all categories
router.get('/', categoryController.getCategories);

// POST create category
router.post(
    '/',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5),
    categoryController.createCategory
);

// GET subcategories by category ID
router.get('/:catId/subcategories', categoryController.getSubcategories);

// GET category by ID
router.get('/:id', categoryController.getCategoryById);

// PUT update category
router.put(
    '/:id',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5),
    categoryController.updateCategory
);

// DELETE category
router.delete(
    '/:id',
    verifyToken,
    requireRole(['Admin']),
    categoryController.deleteCategory
);

module.exports = router;
