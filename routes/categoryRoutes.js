const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ==================== PUBLIC ROUTES ====================

// Get all categories with search/filter (supports ?search=cattle&is_active=true&include_stats=true)
router.get('/', categoryController.getCategories);

// Get category by ID (supports ?include_stats=true)
router.get('/:id', categoryController.getCategoryById);

// Get subcategories by category (supports ?search=dairy&is_active=true&include_stats=true)
router.get('/:catId/subcategories', categoryController.getSubcategories);

// Get subcategory by ID (supports ?include_stats=true)
router.get('/subcategories/:id', categoryController.getSubcategoryById);

// ==================== ADMIN ROUTES ====================

// Category Management
router.post(
    '/',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5), // Support up to 5 images
    categoryController.createCategory
);

router.put(
    '/:id',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5),
    categoryController.updateCategory
);

router.delete(
    '/:id',
    verifyToken,
    requireRole(['Admin']),
    categoryController.deleteCategory
);

// Bulk reorder categories
router.put(
    '/bulk/reorder',
    verifyToken,
    requireRole(['Admin']),
    categoryController.reorderCategories
);

// Get category statistics
router.get(
    '/admin/statistics',
    verifyToken,
    requireRole(['Admin']),
    categoryController.getCategoryStatistics
);

// Subcategory Management
router.post(
    '/subcategories',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5), // Support up to 5 images
    categoryController.createSubcategory
);

router.put(
    '/subcategories/:id',
    verifyToken,
    requireRole(['Admin']),
    upload.array('images', 5),
    categoryController.updateSubcategory
);

router.delete(
    '/subcategories/:id',
    verifyToken,
    requireRole(['Admin']),
    categoryController.deleteSubcategory
);

// Bulk reorder subcategories
router.put(
    '/subcategories/bulk/reorder',
    verifyToken,
    requireRole(['Admin']),
    categoryController.reorderSubcategories
);

module.exports = router;
