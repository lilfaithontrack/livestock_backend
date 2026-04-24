const {
    ethiopiaLocations,
    getRegionNames,
    getCitiesForRegion,
    getSubcitiesForCity,
    getWoredasForSubcity
} = require('../utils/ethiopiaLocations');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all Ethiopia location data
 * GET /api/v1/locations/ethiopia
 */
const getEthiopiaLocations = async (req, res, next) => {
    try {
        return sendSuccess(res, 200, 'Ethiopia location data retrieved successfully', ethiopiaLocations);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all region names
 * GET /api/v1/locations/regions
 */
const getRegions = async (req, res, next) => {
    try {
        const regions = getRegionNames();
        return sendSuccess(res, 200, 'Regions retrieved successfully', { regions });
    } catch (error) {
        next(error);
    }
};

/**
 * Get cities/subcities for a region
 * GET /api/v1/locations/regions/:region/cities
 */
const getCitiesByRegion = async (req, res, next) => {
    try {
        const { region } = req.params;
        const cities = getCitiesForRegion(region);

        if (cities.length === 0) {
            return sendError(res, 404, 'Region not found or has no cities');
        }

        return sendSuccess(res, 200, 'Cities retrieved successfully', {
            region,
            cities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get subcities for a city/region
 * GET /api/v1/locations/regions/:region/cities/:city/subcities
 */
const getSubcities = async (req, res, next) => {
    try {
        const { region, city } = req.params;
        const subcities = getSubcitiesForCity(region, city);

        if (subcities.length === 0) {
            return sendError(res, 404, 'City not found or has no subcities');
        }

        return sendSuccess(res, 200, 'Subcities retrieved successfully', {
            region,
            city,
            subcities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get woredas/kebeles for a subcity
 * GET /api/v1/locations/regions/:region/cities/:city/subcities/:subcity/woredas
 */
const getWoredas = async (req, res, next) => {
    try {
        const { region, city, subcity } = req.params;
        const woredas = getWoredasForSubcity(region, city, subcity);

        if (woredas.length === 0) {
            return sendError(res, 404, 'Subcity not found or has no woredas/kebeles');
        }

        return sendSuccess(res, 200, 'Woredas/Kebeles retrieved successfully', {
            region,
            city,
            subcity,
            woredas
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEthiopiaLocations,
    getRegions,
    getCitiesByRegion,
    getSubcities,
    getWoredas
};
