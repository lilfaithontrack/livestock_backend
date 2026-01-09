const crypto = require('crypto');

/**
 * Generate a unique SKU for a product
 * Format: {category-prefix}-{timestamp}-{random}
 * Example: LVS-20251219-A3D2F
 */
const generateProductSKU = (categoryPrefix = 'PRD') => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${categoryPrefix}-${timestamp}-${random}`;
};

/**
 * Calculate product age from date of birth
 * @param {Date|string} dateOfBirth - Date of birth
 * @returns {number} Age in months
 */
const calculateProductAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;

    const birth = new Date(dateOfBirth);
    const today = new Date();

    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();

    return (years * 12) + months;
};

/**
 * Calculate discounted price based on original price and discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} discountPercentage - Discount percentage (0-100)
 * @returns {number} Discounted price
 */
const calculateDiscountedPrice = (originalPrice, discountPercentage) => {
    if (!originalPrice || !discountPercentage) return originalPrice;

    const discount = (originalPrice * discountPercentage) / 100;
    return parseFloat((originalPrice - discount).toFixed(2));
};

/**
 * Validate health records format
 * @param {Array} healthRecords - Array of health records
 * @returns {boolean} True if valid
 */
const validateHealthRecords = (healthRecords) => {
    if (!Array.isArray(healthRecords)) return false;

    return healthRecords.every(record => {
        return record.hasOwnProperty('date') &&
            record.hasOwnProperty('type') &&
            record.hasOwnProperty('description');
    });
};

/**
 * Format product response for API
 * Calculates computed fields and formats data
 * @param {Object} product - Product model instance
 * @returns {Object} Formatted product
 */
const formatProductResponse = (product) => {
    const productData = product.toJSON ? product.toJSON() : product;

    // Ensure image_urls is always an array
    if (productData.image_urls) {
        // Handle case where image_urls might be a JSON string
        if (typeof productData.image_urls === 'string') {
            try {
                productData.image_urls = JSON.parse(productData.image_urls);
            } catch (e) {
                console.warn('Failed to parse image_urls:', e);
                productData.image_urls = [];
            }
        }
        // Ensure it's an array
        if (!Array.isArray(productData.image_urls)) {
            productData.image_urls = [];
        }
        // Filter out any null/undefined values
        productData.image_urls = productData.image_urls.filter(url => url && url.trim() !== '');
    } else {
        productData.image_urls = [];
    }

    // Ensure video_urls is always an array
    if (productData.video_urls) {
        if (typeof productData.video_urls === 'string') {
            try {
                productData.video_urls = JSON.parse(productData.video_urls);
            } catch (e) {
                productData.video_urls = [];
            }
        }
        if (!Array.isArray(productData.video_urls)) {
            productData.video_urls = [];
        }
    } else {
        productData.video_urls = [];
    }

    // Calculate age if date_of_birth exists
    if (productData.date_of_birth && !productData.age_months) {
        productData.calculated_age_months = calculateProductAge(productData.date_of_birth);
    }

    // Calculate final price with discount
    if (productData.price && productData.discount_percentage) {
        productData.final_price = calculateDiscountedPrice(
            productData.price,
            productData.discount_percentage
        );
        productData.savings = parseFloat((productData.price - productData.final_price).toFixed(2));
    } else {
        productData.final_price = productData.price;
        productData.savings = 0;
    }

    // Add availability flags
    productData.is_available = isProductAvailable(productData);
    productData.is_in_stock = productData.stock_quantity > 0;

    // Format rating
    if (productData.rating) {
        productData.rating = parseFloat(productData.rating);
    }

    return productData;
};

/**
 * Check if product is available for purchase
 * @param {Object} product - Product object
 * @returns {boolean} True if available
 */
const isProductAvailable = (product) => {
    return product.status === 'Live' &&
        product.availability_status === 'available' &&
        product.stock_quantity > 0;
};

/**
 * Update product rating
 * Recalculates average rating based on all reviews
 * @param {number} currentRating - Current average rating
 * @param {number} currentReviewCount - Current number of reviews
 * @param {number} newRating - New rating to add (1-5)
 * @returns {Object} Updated rating and review count
 */
const updateProductRating = (currentRating, currentReviewCount, newRating) => {
    const totalRating = (currentRating || 0) * (currentReviewCount || 0);
    const newReviewCount = (currentReviewCount || 0) + 1;
    const newAverageRating = (totalRating + newRating) / newReviewCount;

    return {
        rating: parseFloat(newAverageRating.toFixed(2)),
        review_count: newReviewCount
    };
};

/**
 * Generate slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
const generateSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-')  // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

/**
 * Validate coordinate pair
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} True if valid coordinates
 */
const validateCoordinates = (latitude, longitude) => {
    return latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * Increment view count
 * @param {Object} product - Product instance
 * @returns {Promise} Updated product
 */
const incrementViewCount = async (product) => {
    product.view_count = (product.view_count || 0) + 1;
    return await product.save();
};

/**
 * Mark product as sold
 * @param {Object} product - Product instance
 * @returns {Promise} Updated product
 */
const markProductAsSold = async (product) => {
    product.availability_status = 'sold';
    product.sold_at = new Date();
    product.stock_quantity = 0;
    return await product.save();
};

/**
 * Validate vaccination record structure
 * @param {Object} record - Vaccination record
 * @returns {boolean} True if valid
 */
const validateVaccinationRecord = (record) => {
    const requiredFields = ['vaccine_name', 'date', 'veterinarian'];
    return requiredFields.every(field => record.hasOwnProperty(field) && record[field]);
};

/**
 * Format currency for display
 * @param {number} amount - Amount
 * @param {string} currency - Currency code (default: ETB)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'ETB') => {
    const formatted = parseFloat(amount).toFixed(2);
    return `${currency} ${formatted}`;
};

module.exports = {
    generateProductSKU,
    calculateProductAge,
    calculateDiscountedPrice,
    validateHealthRecords,
    formatProductResponse,
    isProductAvailable,
    updateProductRating,
    generateSlug,
    validateCoordinates,
    calculateDistance,
    incrementViewCount,
    markProductAsSold,
    validateVaccinationRecord,
    formatCurrency
};
