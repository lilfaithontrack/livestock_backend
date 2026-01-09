const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Product creation validation rules
 */
const validateProductCreation = [
    // Basic Information
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 3, max: 255 }).withMessage('Name must be between 3 and 255 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('Description must not exceed 5000 characters'),

    body('product_type')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Product type must not exceed 50 characters'),

    body('sub_cat_id')
        .notEmpty().withMessage('Subcategory is required')
        .isUUID().withMessage('Invalid subcategory ID'),

    // Pricing & Inventory
    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0.01 }).withMessage('Price must be greater than 0')
        .toFloat(),

    body('deleted_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Original price must be 0 or greater')
        .toFloat(),

    body('discount_percentage')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
        .toFloat(),

    body('currency')
        .optional()
        .isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters (e.g., ETB, USD)'),

    body('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock quantity must be 0 or greater')
        .toInt(),

    body('minimum_order_quantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Minimum order quantity must be at least 1')
        .toInt(),

    body('low_stock_threshold')
        .optional()
        .isInt({ min: 0 }).withMessage('Low stock threshold must be 0 or greater')
        .toInt(),

    body('reserved_stock')
        .optional()
        .isInt({ min: 0 }).withMessage('Reserved stock must be 0 or greater')
        .toInt(),

    body('enable_stock_management')
        .optional()
        .isBoolean().withMessage('Enable stock management must be a boolean')
        .toBoolean(),

    body('allow_backorders')
        .optional()
        .isBoolean().withMessage('Allow backorders must be a boolean')
        .toBoolean(),

    // Product Specifications (Generic)
    body('weight')
        .optional()
        .isFloat({ min: 0 }).withMessage('Weight must be 0 or greater')
        .toFloat(),

    body('weight_unit')
        .optional()
        .trim()
        .isLength({ max: 10 }).withMessage('Weight unit must not exceed 10 characters'),

    body('dimensions')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    throw new Error('Dimensions must be valid JSON');
                }
            }
            return true;
        }),

    body('color')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Color must not exceed 100 characters'),

    body('size')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Size must not exceed 50 characters'),

    body('material')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Material must not exceed 255 characters'),

    body('brand')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Brand must not exceed 100 characters'),

    body('model_number')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Model number must not exceed 100 characters'),

    body('condition')
        .optional()
        .isIn(['new', 'like_new', 'good', 'fair', 'poor', 'refurbished'])
        .withMessage('Invalid condition'),

    body('warranty_info')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Warranty info must not exceed 2000 characters'),

    body('manufacture_date')
        .optional()
        .isISO8601().withMessage('Invalid date format for manufacture date'),

    body('expiry_date')
        .optional()
        .isISO8601().withMessage('Invalid date format for expiry date')
        .custom((value, { req }) => {
            if (value && req.body.manufacture_date) {
                const expiry = new Date(value);
                const manufacture = new Date(req.body.manufacture_date);
                if (expiry <= manufacture) {
                    throw new Error('Expiry date must be after manufacture date');
                }
            }
            return true;
        }),

    // Metadata - Industry-specific attributes
    body('metadata')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    throw new Error('Metadata must be valid JSON');
                }
            }
            return true;
        }),


    // Location & Logistics
    body('location')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Location must not exceed 255 characters'),

    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
        .toFloat(),

    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
        .toFloat(),

    body('shipping_available')
        .optional()
        .isBoolean().withMessage('Shipping available must be a boolean')
        .toBoolean(),

    body('delivery_timeframe_days')
        .optional()
        .isInt({ min: 0, max: 365 }).withMessage('Delivery timeframe must be between 0 and 365 days')
        .toInt(),

    body('pickup_available')
        .optional()
        .isBoolean().withMessage('Pickup available must be a boolean')
        .toBoolean(),

    // Certifications & Compliance
    body('certificate_urls')
        .optional()
        .isArray().withMessage('Certificate URLs must be an array'),

    body('license_numbers')
        .optional()
        .isArray().withMessage('License numbers must be an array'),

    body('organic_certified')
        .optional()
        .isBoolean().withMessage('Organic certified must be a boolean')
        .toBoolean(),

    // Marketplace Features
    body('featured')
        .optional()
        .isBoolean().withMessage('Featured must be a boolean')
        .toBoolean(),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array'),

    // Custom validation: Check if deleted_price is greater than price
    body('deleted_price')
        .optional()
        .custom((value, { req }) => {
            if (value && req.body.price && parseFloat(value) <= parseFloat(req.body.price)) {
                throw new Error('Original price must be greater than current price');
            }
            return true;
        }),

    handleValidationErrors
];

/**
 * Product update validation rules (similar but some fields not required)
 */
const validateProductUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 }).withMessage('Name must be between 3 and 255 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('Description must not exceed 5000 characters'),

    body('price')
        .optional()
        .isFloat({ min: 0.01 }).withMessage('Price must be greater than 0')
        .toFloat(),

    body('deleted_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Original price must be 0 or greater')
        .toFloat(),

    body('discount_percentage')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
        .toFloat(),

    body('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock quantity must be 0 or greater')
        .toInt(),

    body('weight')
        .optional()
        .isFloat({ min: 0 }).withMessage('Weight must be 0 or greater')
        .toFloat(),

    body('color')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Color must not exceed 100 characters'),

    body('size')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Size must not exceed 50 characters'),

    body('brand')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Brand must not exceed 100 characters'),

    body('condition')
        .optional()
        .isIn(['new', 'like_new', 'good', 'fair', 'poor', 'refurbished'])
        .withMessage('Invalid condition'),

    body('metadata')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    throw new Error('Metadata must be valid JSON');
                }
            }
            return true;
        }),

    body('location')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Location must not exceed 255 characters'),

    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
        .toFloat(),

    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
        .toFloat(),

    handleValidationErrors
];

/**
 * Category validation rules
 */
const validateCategory = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('slug')
        .optional()
        .trim()
        .isLength({ max: 120 }).withMessage('Slug must not exceed 120 characters')
        .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

    body('display_order')
        .optional()
        .isInt({ min: 0 }).withMessage('Display order must be 0 or greater')
        .toInt(),

    body('is_active')
        .optional()
        .isBoolean().withMessage('is_active must be a boolean')
        .toBoolean(),

    handleValidationErrors
];

/**
 * Subcategory validation rules
 */
const validateSubcategory = [
    body('name')
        .trim()
        .notEmpty().withMessage('Subcategory name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('cat_id')
        .notEmpty().withMessage('Category ID is required')
        .isUUID().withMessage('Invalid category ID'),

    body('slug')
        .optional()
        .trim()
        .isLength({ max: 120 }).withMessage('Slug must not exceed 120 characters')
        .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

    body('display_order')
        .optional()
        .isInt({ min: 0 }).withMessage('Display order must be 0 or greater')
        .toInt(),

    body('is_active')
        .optional()
        .isBoolean().withMessage('is_active must be a boolean')
        .toBoolean(),

    handleValidationErrors
];

module.exports = {
    validateProductCreation,
    validateProductUpdate,
    validateCategory,
    validateSubcategory,
    handleValidationErrors
};
