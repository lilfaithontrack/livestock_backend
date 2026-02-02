const { Butcher } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all butchers (Admin)
 * GET /api/v1/butchers
 */
const getAllButchers = async (req, res, next) => {
    try {
        const { specialization, is_active } = req.query;
        const where = {};

        if (specialization) where.specialization = specialization;
        if (is_active !== undefined) where.is_active = is_active === 'true';

        const butchers = await Butcher.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Butchers retrieved successfully', {
            butchers,
            count: butchers.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get butcher by ID
 * GET /api/v1/butchers/:id
 */
const getButcherById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const butcher = await Butcher.findByPk(id);

        if (!butcher) {
            return sendError(res, 404, 'Butcher not found');
        }

        return sendSuccess(res, 200, 'Butcher retrieved successfully', { butcher });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new butcher (Admin)
 * POST /api/v1/butchers
 */
const createButcher = async (req, res, next) => {
    try {
        const {
            name, email, phone, address, location,
            specialization, experience_years, license_number
        } = req.body;

        // Validation
        if (!name || !email || !phone) {
            return sendError(res, 400, 'Name, email, and phone are required');
        }

        // Check if email already exists
        const existingButcher = await Butcher.findOne({ where: { email } });
        if (existingButcher) {
            return sendError(res, 400, 'Butcher with this email already exists');
        }

        const butcher = await Butcher.create({
            name,
            email,
            phone,
            address,
            location,
            specialization: specialization || 'all',
            experience_years: experience_years || 0,
            license_number,
            is_active: true
        });

        return sendSuccess(res, 201, 'Butcher created successfully', {
            butcher
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update butcher (Admin)
 * PUT /api/v1/butchers/:id
 */
const updateButcher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name, email, phone, address, location,
            specialization, experience_years, license_number, rating
        } = req.body;

        const butcher = await Butcher.findByPk(id);

        if (!butcher) {
            return sendError(res, 404, 'Butcher not found');
        }

        // Check if email is being changed and if it already exists
        if (email && email !== butcher.email) {
            const existingButcher = await Butcher.findOne({ where: { email } });
            if (existingButcher) {
                return sendError(res, 400, 'Butcher with this email already exists');
            }
        }

        await butcher.update({
            name: name || butcher.name,
            email: email || butcher.email,
            phone: phone || butcher.phone,
            address: address !== undefined ? address : butcher.address,
            location: location !== undefined ? location : butcher.location,
            specialization: specialization || butcher.specialization,
            experience_years: experience_years !== undefined ? experience_years : butcher.experience_years,
            license_number: license_number !== undefined ? license_number : butcher.license_number,
            rating: rating !== undefined ? rating : butcher.rating
        });

        return sendSuccess(res, 200, 'Butcher updated successfully', { butcher });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete butcher (Admin)
 * DELETE /api/v1/butchers/:id
 */
const deleteButcher = async (req, res, next) => {
    try {
        const { id } = req.params;

        const butcher = await Butcher.findByPk(id);

        if (!butcher) {
            return sendError(res, 404, 'Butcher not found');
        }

        await butcher.destroy();

        return sendSuccess(res, 200, 'Butcher deleted successfully', {});
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle butcher active status (Admin)
 * PATCH /api/v1/butchers/:id/toggle
 */
const toggleButcherStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const butcher = await Butcher.findByPk(id);

        if (!butcher) {
            return sendError(res, 404, 'Butcher not found');
        }

        await butcher.update({ is_active: !butcher.is_active });

        return sendSuccess(res, 200, `Butcher ${butcher.is_active ? 'activated' : 'deactivated'}`, {
            butcher
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get active butchers (Public - for mobile app)
 * GET /api/v1/butchers/public
 */
const getActiveButchers = async (req, res, next) => {
    try {
        const { specialization, limit = 10 } = req.query;
        const where = { is_active: true };

        if (specialization) where.specialization = specialization;

        const butchers = await Butcher.findAll({
            where,
            order: [['rating', 'DESC'], ['total_services', 'DESC']],
            limit: parseInt(limit)
        });

        return sendSuccess(res, 200, 'Butchers retrieved successfully', {
            butchers,
            count: butchers.length
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllButchers,
    getButcherById,
    createButcher,
    updateButcher,
    deleteButcher,
    toggleButcherStatus,
    getActiveButchers
};
