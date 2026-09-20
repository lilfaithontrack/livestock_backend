const { Product, QerchaPackage } = require('../models');
const { generateProductSKU, calculateProductAge } = require('./productHelpers');
const { compressMultipleImages } = require('../middleware/uploadMiddleware');

/**
 * Shared "create product + Qercha package" transaction logic, used by both:
 *  - the admin endpoint (productController.createProductWithQercha)
 *  - the seller-facing endpoint (qerchaController.createSellerProductWithQercha)
 *
 * The caller is responsible for opening/committing/rolling back the transaction,
 * for resolving `seller_id` (and any ownership checks around it), and for
 * whatever product `status` it wants the created product to have.
 *
 * @param {Object} params
 * @param {Object} params.body - the raw request body fields (same shape used by createProductWithQercha)
 * @param {Array} params.files - req.files (uploaded images), optional
 * @param {String} params.seller_id - resolved seller (owner) user_id for the product
 * @param {String} params.host_user_id - user_id that should be recorded as the Qercha host
 * @param {String} params.productStatus - Product.status to set ('Live' | 'Pending' | ...)
 * @param {Object} params.transaction - Sequelize transaction
 * @returns {Promise<{ product, qerchaPackage }>}
 */
async function createProductWithQerchaTransaction({
    body,
    files,
    seller_id,
    host_user_id,
    productStatus,
    autoApproveQercha = false,
    approved_by = null,
    transaction
}) {
    const {
        name, description, product_type, sub_cat_id,
        price, deleted_price, discount_percentage, currency,
        stock_quantity, minimum_order_quantity,
        breed, age_months, date_of_birth, gender, weight_kg,
        height_cm, color_markings, mother_id, father_id,
        health_status, vaccination_records, medical_history,
        veterinary_certificates, last_health_checkup,
        genetic_traits, milk_production_liters_per_day,
        breeding_history, offspring_count,
        location, region, city, subcity, woreda_kebele, latitude, longitude, shipping_available,
        delivery_timeframe_days, pickup_available,
        certificate_urls, license_numbers, organic_certified,
        featured, tags,
        video_urls, youtube_video_url, social_media_links,
        metadata,
        // Qercha fields
        create_qercha,
        total_shares,
        start_date,
        expiry_date,
        category,
        ethiopian_start_display,
        ethiopian_expiry_display,
        time_window_note,
        qercha_location,
        delivery_info
    } = body;

    // Handle uploaded images with compression
    let image_urls = [];
    if (files && files.length > 0) {
        image_urls = await compressMultipleImages(files, {
            width: 1200,
            height: 1200,
            quality: 85
        });
    }

    const sku = generateProductSKU('LVS');
    const calculatedAge = age_months || (date_of_birth ? calculateProductAge(date_of_birth) : null);

    const product = await Product.create({
        seller_id,
        sub_cat_id,
        sku,
        name,
        description,
        product_type: product_type || 'livestock',
        price,
        deleted_price,
        discount_percentage: discount_percentage || 0,
        currency: currency || 'ETB',
        stock_quantity: stock_quantity || 1,
        minimum_order_quantity: minimum_order_quantity || 1,
        breed,
        age_months: calculatedAge,
        date_of_birth,
        gender,
        weight_kg,
        height_cm,
        color_markings,
        mother_id,
        father_id,
        health_status: health_status || 'unknown',
        vaccination_records: vaccination_records ? JSON.parse(vaccination_records) : [],
        medical_history,
        veterinary_certificates: veterinary_certificates ? JSON.parse(veterinary_certificates) : [],
        last_health_checkup,
        genetic_traits,
        milk_production_liters_per_day,
        breeding_history,
        offspring_count: offspring_count || 0,
        location,
        latitude,
        longitude,
        shipping_available: shipping_available || false,
        delivery_timeframe_days,
        pickup_available: pickup_available !== undefined ? pickup_available : true,
        certificate_urls: certificate_urls ? JSON.parse(certificate_urls) : [],
        license_numbers: license_numbers ? JSON.parse(license_numbers) : [],
        organic_certified: organic_certified || false,
        image_urls,
        video_urls: video_urls ? JSON.parse(video_urls) : [],
        youtube_video_url,
        social_media_links: social_media_links ? (typeof social_media_links === 'string' ? JSON.parse(social_media_links) : social_media_links) : {},
        featured: featured || false,
        tags: tags ? JSON.parse(tags) : [],
        metadata: metadata ? JSON.parse(metadata) : {},
        status: productStatus,
        availability_status: 'available'
    }, { transaction });

    let qerchaPackage = null;
    const shouldCreateQercha = create_qercha === 'true' || create_qercha === true;

    if (shouldCreateQercha) {
        const sharesCount = parseFloat(total_shares) || 4;

        if (sharesCount < 2) {
            const err = new Error('Qercha package requires at least 2 shares');
            err.statusCode = 400;
            throw err;
        }

        qerchaPackage = await QerchaPackage.create({
            ox_product_id: product.product_id,
            total_shares: sharesCount,
            shares_available: sharesCount,
            host_user_id,
            status: 'Active',
            moderation_status: autoApproveQercha ? 'approved' : 'pending',
            admin_approved_by: autoApproveQercha ? approved_by : null,
            approved_at: autoApproveQercha ? new Date() : null,
            start_date: start_date || null,
            expiry_date: expiry_date || null,
            category: category || null,
            ethiopian_start_display: ethiopian_start_display || null,
            ethiopian_expiry_display: ethiopian_expiry_display || null,
            time_window_note: time_window_note || null,
            location: qercha_location || null,
            delivery_info: delivery_info || null
        }, { transaction });
    }

    return { product, qerchaPackage };
}

module.exports = {
    createProductWithQerchaTransaction
};
