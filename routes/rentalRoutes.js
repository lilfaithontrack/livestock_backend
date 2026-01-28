const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { authenticate, isAdmin } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============
// Get rental categories
router.get('/categories', rentalController.getCategories);

// Get all approved rentals (with filters)
router.get('/', rentalController.getRentals);

// Get single rental by ID
router.get('/:id', rentalController.getRentalById);

// Track contact/call button click
router.post('/:id/contact', rentalController.trackContact);

// ============ AUTHENTICATED USER ROUTES ============
// Create a new rental
router.post('/', authenticate, rentalController.createRental);

// Get user's own rentals
router.get('/my/listings', authenticate, rentalController.getMyRentals);

// Update own rental
router.put('/:id', authenticate, rentalController.updateRental);

// Delete own rental
router.delete('/:id', authenticate, rentalController.deleteRental);

// ============ ADMIN ROUTES ============
// Get all rentals (admin)
router.get('/admin/all', authenticate, isAdmin, rentalController.adminGetRentals);

// Get all categories including inactive (admin)
router.get('/admin/categories', authenticate, isAdmin, rentalController.adminGetCategories);

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

// Admin update rental
router.put('/admin/:id', authenticate, isAdmin, rentalController.adminUpdateRental);

// Admin delete rental
router.delete('/admin/:id', authenticate, isAdmin, rentalController.adminDeleteRental);

module.exports = router;
