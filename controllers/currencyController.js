const { Currency } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all currencies
 * GET /api/v1/currencies
 */
const getCurrencies = async (req, res, next) => {
    try {
        const { active_only = true } = req.query;

        const where = {};
        if (active_only === 'true') {
            where.is_active = true;
        }

        const currencies = await Currency.findAll({
            where,
            order: [['is_default', 'DESC'], ['code', 'ASC']]
        });

        return sendSuccess(res, 200, 'Currencies retrieved successfully', { currencies });
    } catch (error) {
        next(error);
    }
};

/**
 * Get currency by ID
 * GET /api/v1/currencies/:id
 */
const getCurrencyById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const currency = await Currency.findByPk(id);

        if (!currency) {
            return sendError(res, 404, 'Currency not found');
        }

        return sendSuccess(res, 200, 'Currency retrieved successfully', { currency });
    } catch (error) {
        next(error);
    }
};

/**
 * Get currency by code
 * GET /api/v1/currencies/code/:code
 */
const getCurrencyByCode = async (req, res, next) => {
    try {
        const { code } = req.params;

        const currency = await Currency.findOne({
            where: { code: code.toUpperCase() }
        });

        if (!currency) {
            return sendError(res, 404, 'Currency not found');
        }

        return sendSuccess(res, 200, 'Currency retrieved successfully', { currency });
    } catch (error) {
        next(error);
    }
};

/**
 * Create currency (Admin only)
 * POST /api/v1/admin/currencies
 */
const createCurrency = async (req, res, next) => {
    try {
        const { code, name, symbol, exchange_rate_to_usd, is_active, is_default, decimal_places } = req.body;

        // Check if currency code already exists
        const existingCurrency = await Currency.findOne({ where: { code: code.toUpperCase() } });
        if (existingCurrency) {
            return sendError(res, 409, 'Currency with this code already exists');
        }

        // If setting as default, unset other defaults
        if (is_default) {
            await Currency.update({ is_default: false }, { where: { is_default: true } });
        }

        const currency = await Currency.create({
            code: code.toUpperCase(),
            name,
            symbol,
            exchange_rate_to_usd: exchange_rate_to_usd || 1.0000,
            is_active: is_active !== undefined ? is_active : true,
            is_default: is_default || false,
            decimal_places: decimal_places || 2,
            last_updated: new Date()
        });

        return sendSuccess(res, 201, 'Currency created successfully', { currency });
    } catch (error) {
        next(error);
    }
};

/**
 * Update currency (Admin only)
 * PUT /api/v1/admin/currencies/:id
 */
const updateCurrency = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, symbol, exchange_rate_to_usd, is_active, is_default, decimal_places } = req.body;

        const currency = await Currency.findByPk(id);

        if (!currency) {
            return sendError(res, 404, 'Currency not found');
        }

        // If setting as default, unset other defaults
        if (is_default && !currency.is_default) {
            await Currency.update({ is_default: false }, { where: { is_default: true } });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (symbol !== undefined) updates.symbol = symbol;
        if (exchange_rate_to_usd !== undefined) {
            updates.exchange_rate_to_usd = exchange_rate_to_usd;
            updates.last_updated = new Date();
        }
        if (is_active !== undefined) updates.is_active = is_active;
        if (is_default !== undefined) updates.is_default = is_default;
        if (decimal_places !== undefined) updates.decimal_places = decimal_places;

        await currency.update(updates);

        return sendSuccess(res, 200, 'Currency updated successfully', { currency });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete currency (Admin only)
 * DELETE /api/v1/admin/currencies/:id
 */
const deleteCurrency = async (req, res, next) => {
    try {
        const { id } = req.params;

        const currency = await Currency.findByPk(id);

        if (!currency) {
            return sendError(res, 404, 'Currency not found');
        }

        // Prevent deleting default currency
        if (currency.is_default) {
            return sendError(res, 400, 'Cannot delete the default currency');
        }

        await currency.destroy();

        return sendSuccess(res, 200, 'Currency deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Convert amount between currencies
 * POST /api/v1/currencies/convert
 */
const convertCurrency = async (req, res, next) => {
    try {
        const { amount, from_currency, to_currency } = req.body;

        if (!amount || !from_currency || !to_currency) {
            return sendError(res, 400, 'Amount, from_currency, and to_currency are required');
        }

        const fromCurr = await Currency.findOne({ where: { code: from_currency.toUpperCase() } });
        const toCurr = await Currency.findOne({ where: { code: to_currency.toUpperCase() } });

        if (!fromCurr || !toCurr) {
            return sendError(res, 404, 'One or both currencies not found');
        }

        // Convert to USD first, then to target currency
        const amountInUSD = parseFloat(amount) * parseFloat(fromCurr.exchange_rate_to_usd);
        const convertedAmount = amountInUSD / parseFloat(toCurr.exchange_rate_to_usd);

        return sendSuccess(res, 200, 'Currency converted successfully', {
            original_amount: parseFloat(amount),
            from_currency: fromCurr.code,
            to_currency: toCurr.code,
            converted_amount: parseFloat(convertedAmount.toFixed(toCurr.decimal_places)),
            exchange_rate: parseFloat((parseFloat(fromCurr.exchange_rate_to_usd) / parseFloat(toCurr.exchange_rate_to_usd)).toFixed(4))
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCurrencies,
    getCurrencyById,
    getCurrencyByCode,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    convertCurrency
};
