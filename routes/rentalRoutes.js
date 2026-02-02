const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

const isAdmin = authorize('Admin');

// ============ PUBLIC ROUTES ============
// Get rental categories
router.get('/categories', rentalController.getCategories);

// Get all approved rentals (with filters)
router.get('/', rentalController.getRentals);

// ============ AUTHENTICATED USER ROUTES ============
// Create a new rental (with up to 5 images)
router.post('/', authenticate, upload.array('images', 5), rentalController.createRental);

// Get user's own rentals
router.get('/my/listings', authenticate, rentalController.getMyRentals);

// ============ ADMIN ROUTES ============
// Get all rentals (admin)
router.get('/admin/all', authenticate, isAdmin, rentalController.adminGetRentals);

// Get all categories including inactive (admin)
router.get('/admin/categories', authenticate, isAdmin, rentalController.adminGetCategories);

// Admin create rental (with up to 5 images)
router.post('/admin/rentals', authenticate, isAdmin, upload.array('images', 5), rentalController.adminCreateRental);

// Create category (admin)
router.post('/admin/categories', authenticate, isAdmin, rentalController.createCategory);

// Update category (admin)
router.put('/admin/categories/:id', authenticate, isAdmin, rentalController.updateCategory);

// Delete category (admin)
router.delete('/admin/categories/:id', authenticate, isAdmin, rentalController.deleteCategory);

// Approve rental (admin)
router.put('/admin/:id/approve', authenticate, isAdmin, rentalController.approveRental);

// Reject rental (admin)
router.put('/admin/:id/reject', authenticate, isAdmin, rentalController.rejectRental);

// Toggle featured (admin)
router.put('/admin/:id/featured', authenticate, isAdmin, rentalController.toggleFeatured);

// Admin update rental (with up to 5 images)
router.put('/admin/:id', authenticate, isAdmin, upload.array('images', 5), rentalController.adminUpdateRental);

// Admin delete rental
router.delete('/admin/:id', authenticate, isAdmin, rentalController.adminDeleteRental);

// Update own rental (with up to 5 images)
router.put('/:id', authenticate, upload.array('images', 5), rentalController.updateRental);

// Delete own rental
router.delete('/:id', authenticate, rentalController.deleteRental);

// ============ ID ROUTES (must be last) ============
// Get single rental by ID
router.get('/:id', rentalController.getRentalById);

// Track contact/call button click
router.post('/:id/contact', rentalController.trackContact);

module.exports = router;
