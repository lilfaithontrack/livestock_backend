const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const locationController = require('../controllers/locationController');

/**
 * @route   GET /api/v1/locations/ethiopia
 * @desc    Get all Ethiopia location data (regions, cities, subcities, woredas)
 * @access  Public
 */
router.get('/ethiopia', locationController.getEthiopiaLocations);

/**
 * @route   GET /api/v1/locations/regions
 * @desc    Get all region names
 * @access  Public
 */
router.get('/regions', locationController.getRegions);

/**
 * @route   GET /api/v1/locations/regions/:region/cities
 * @desc    Get cities for a region
 * @access  Public
 */
router.get('/regions/:region/cities', locationController.getCitiesByRegion);

/**
 * @route   GET /api/v1/locations/regions/:region/cities/:city/subcities
 * @desc    Get subcities for a city
 * @access  Public
 */
router.get('/regions/:region/cities/:city/subcities', locationController.getSubcities);

/**
 * @route   GET /api/v1/locations/regions/:region/cities/:city/subcities/:subcity/woredas
 * @desc    Get woredas/kebeles for a subcity
 * @access  Public
 */
router.get('/regions/:region/cities/:city/subcities/:subcity/woredas', locationController.getWoredas);

module.exports = router;
