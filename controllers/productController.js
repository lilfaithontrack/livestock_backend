const { Product, User, ProductSubcategory, ProductCategory, QerchaPackage } = require('../models');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { compressMultipleImages } = require('../middleware/uploadMiddleware');
const {
    generateProductSKU,
    formatProductResponse,
    incrementViewCount,
    calculateProductAge
} = require('../utils/productHelpers');
const path = require('path');
const fs = require('fs');

/**
 * Create product (Seller only, or Admin - can specify seller)
 * POST /api/v1/seller/products or POST /api/v1/admin/products
 */
const createProduct = async (req, res, next) => {
    try {
        const {
            // Basic Information
            name, description, product_type, sub_cat_id,
            // Pricing & Inventory
            price, deleted_price, discount_percentage, currency,
            stock_quantity, minimum_order_quantity,
            // Livestock Specific
            breed, age_months, date_of_birth, gender, weight_kg,
            height_cm, color_markings, mother_id, father_id,
            // Health & Medical
            health_status, vaccination_records, medical_history,
            veterinary_certificates, last_health_checkup,
            // Genetics & Performance
            genetic_traits, milk_production_liters_per_day,
            breeding_history, offspring_count,
            // Location & Logistics
            location, latitude, longitude, shipping_available,
            delivery_timeframe_days, pickup_available,
            // Certifications & Compliance
            certificate_urls, license_numbers, organic_certified,
            // Marketplace Features
            featured, tags,
            // Media
            video_urls, youtube_video_url, social_media_links,
            // Metadata
            metadata,
            // Admin-only: seller_id
            seller_id: provided_seller_id
        } = req.body;

        const user_role = req.user.role;
        const user_id = req.user.user_id;

        // Determine seller_id: Admin can specify, others use their own ID
        let seller_id;
        if (user_role === 'Admin') {
            // Admin can specify seller_id or use their own
            seller_id = provided_seller_id || user_id;
            // Validate that the specified seller exists
            const specifiedSeller = await User.findByPk(seller_id);
            if (!specifiedSeller) {
                return sendError(res, 400, 'Specified seller does not exist');
            }
            // For admin-created products, skip KYC check entirely
        } else {
            // Non-admin users (sellers) must use their own ID and have KYC
            seller_id = user_id;
            const seller = await User.findByPk(seller_id);
            if (!seller) {
                return sendError(res, 404, 'Seller not found');
            }
            // Check seller KYC status (only for non-admin users)
            if (!seller.kyc_status) {
                return sendError(res, 403, 'KYC verification required. Please complete KYC to upload products.');
            }
        }

        // Handle uploaded images with compression
        let image_urls = [];
        if (req.files && req.files.length > 0) {
            image_urls = await compressMultipleImages(req.files, {
                width: 1200,
                height: 1200,
                quality: 85
            });
        }

        // Generate unique SKU
        const sku = generateProductSKU('LVS');

        // Calculate age from date_of_birth if not provided
        const calculatedAge = age_months || (date_of_birth ? calculateProductAge(date_of_birth) : null);

        // Create product with all new fields
        const product = await Product.create({
            // Basic Information
            seller_id,
            sub_cat_id,
            sku,
            name,
            description,
            product_type: product_type || 'livestock',

            // Pricing & Inventory
            price,
            deleted_price,
            discount_percentage: discount_percentage || 0,
            currency: currency || 'ETB',
            stock_quantity: stock_quantity || 1,
            minimum_order_quantity: minimum_order_quantity || 1,

            // Livestock Specific
            breed,
            age_months: calculatedAge,
            date_of_birth,
            gender,
            weight_kg,
            height_cm,
            color_markings,
            mother_id,
            father_id,

            // Health & Medical
            health_status: health_status || 'unknown',
            vaccination_records: vaccination_records ? JSON.parse(vaccination_records) : [],
            medical_history,
            veterinary_certificates: veterinary_certificates ? JSON.parse(veterinary_certificates) : [],
            last_health_checkup,

            // Genetics & Performance
            genetic_traits,
            milk_production_liters_per_day,
            breeding_history,
            offspring_count: offspring_count || 0,

            // Location & Logistics
            location,
            latitude,
            longitude,
            shipping_available: shipping_available || false,
            delivery_timeframe_days,
            pickup_available: pickup_available !== undefined ? pickup_available : true,

            // Certifications & Compliance
            certificate_urls: certificate_urls ? JSON.parse(certificate_urls) : [],
            license_numbers: license_numbers ? JSON.parse(license_numbers) : [],
            organic_certified: organic_certified || false,

            // Media
            image_urls,
            video_urls: video_urls ? JSON.parse(video_urls) : [],
            youtube_video_url,
            social_media_links: social_media_links ? (typeof social_media_links === 'string' ? JSON.parse(social_media_links) : social_media_links) : {},

            // Marketplace Features
            featured: featured || false,
            tags: tags ? JSON.parse(tags) : [],

            // Metadata
            metadata: metadata ? JSON.parse(metadata) : {},

            // Admin & Status
            // Admins can set status directly, sellers default to Pending
            status: (user_role === 'Admin' && req.body.status) ? req.body.status : 'Pending',
            availability_status: 'available'
        });

        return sendSuccess(res, 201, 'Product created successfully and pending admin approval', {
            product_id: product.product_id,
            sku: product.sku,
            status: product.status
        });
    } catch (error) {
        // Clean up uploaded files if creation fails
        if (req.files) {
            req.files.forEach(file => {
                const filePath = path.join(process.env.UPLOAD_DIR || './uploads', 'compressed', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
        next(error);
    }
};

/**
 * Get products (Browse all approved products)
 * GET /api/v1/products
 */
const getProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            subcategory,
            search,
            product_type,
            min_price,
            max_price,
            breed,
            gender,
            health_status,
            featured,
            availability_status,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        // Build where clause
        const where = { status: 'Live' };

        if (search) {
            where.name = { [require('sequelize').Op.like]: `%${search}%` };
        }

        if (subcategory) {
            where.sub_cat_id = subcategory;
        }

        if (product_type) {
            where.product_type = product_type;
        }

        if (min_price || max_price) {
            where.price = {};
            if (min_price) where.price[require('sequelize').Op.gte] = parseFloat(min_price);
            if (max_price) where.price[require('sequelize').Op.lte] = parseFloat(max_price);
        }

        if (breed) {
            where.breed = { [require('sequelize').Op.like]: `%${breed}%` };
        }

        if (gender) {
            where.gender = gender;
        }

        if (health_status) {
            where.health_status = health_status;
        }

        if (featured !== undefined) {
            where.featured = featured === 'true';
        }

        if (availability_status) {
            where.availability_status = availability_status;
        } else {
            where.availability_status = 'available'; // Default to available products
        }

        const products = await Product.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'phone', 'email']
                },
                {
                    model: ProductSubcategory,
                    as: 'subcategory',
                    attributes: ['sub_cat_id', 'name', 'slug'],
                    ...(category && {
                        where: { cat_id: category }
                    }),
                    include: [
                        {
                            model: ProductCategory,
                            as: 'category',
                            attributes: ['cat_id', 'name', 'slug']
                        }
                    ]
                }
            ],
            order: [[sort, order.toUpperCase()]]
        });

        // Format products with computed fields
        const formattedProducts = products.rows.map(product => formatProductResponse(product));

        return sendSuccess(res, 200, 'Products retrieved successfully', {
            products: formattedProducts,
            pagination: {
                total: products.count,
                page: parseInt(page),
                pages: Math.ceil(products.count / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get product by ID
 * GET /api/v1/products/:id
 */
const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'phone', 'email', 'address']
                },
                {
                    model: ProductSubcategory,
                    as: 'subcategory',
                    include: [
                        {
                            model: ProductCategory,
                            as: 'category'
                        }
                    ]
                },
                {
                    model: Product,
                    as: 'mother',
                    attributes: ['product_id', 'name', 'metadata']
                },
                {
                    model: Product,
                    as: 'father',
                    attributes: ['product_id', 'name', 'metadata']
                }
            ]
        });

        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        // Increment view count
        await incrementViewCount(product);

        // Format response with computed fields
        const formattedProduct = formatProductResponse(product);

        return sendSuccess(res, 200, 'Product retrieved successfully', { product: formattedProduct });
    } catch (error) {
        next(error);
    }
};

/**
 * Update product (Seller only - own products, or Admin - any product)
 * PUT /api/v1/seller/products/:id or PUT /api/v1/admin/products/:id
 */
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.user_id;
        const user_role = req.user.role;

        const product = await Product.findByPk(id);

        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        // Ensure seller owns the product (unless user is Admin)
        if (user_role !== 'Admin' && product.seller_id !== user_id) {
            return sendError(res, 403, 'You can only update your own products');
        }

        // Extract all updateable fields from request body
        const {
            // Basic Information
            name, description, product_type,
            // Pricing & Inventory
            price, deleted_price, discount_percentage,
            stock_quantity, minimum_order_quantity,
            // Livestock Specific
            breed, age_months, date_of_birth, gender, weight_kg,
            height_cm, color_markings,
            // Health & Medical
            health_status, vaccination_records, medical_history,
            veterinary_certificates, last_health_checkup,
            // Genetics & Performance
            genetic_traits, milk_production_liters_per_day,
            breeding_history, offspring_count,
            // Location & Logistics
            location, latitude, longitude, shipping_available,
            delivery_timeframe_days, pickup_available,
            // Certifications & Compliance
            certificate_urls, license_numbers, organic_certified,
            // Media
            video_urls, youtube_video_url, social_media_links,
            // Marketplace Features
            tags,
            // Metadata
            metadata
        } = req.body;

        // Update fields if provided
        const updates = {};

        // Handle images: merge existing with new, or replace all
        let existing_images = [];
        if (req.body.existing_images) {
            try {
                existing_images = typeof req.body.existing_images === 'string'
                    ? JSON.parse(req.body.existing_images)
                    : req.body.existing_images;
            } catch (e) {
                console.error('Error parsing existing_images:', e);
            }
        }

        let removed_images = [];
        if (req.body.removed_images) {
            try {
                removed_images = typeof req.body.removed_images === 'string'
                    ? JSON.parse(req.body.removed_images)
                    : req.body.removed_images;
            } catch (e) {
                console.error('Error parsing removed_images:', e);
            }
        }

        // Handle uploaded images with compression
        if (req.files && req.files.length > 0) {
            // Compress and save new images
            const newImages = await compressMultipleImages(req.files, {
                width: 1200,
                height: 1200,
                quality: 85
            });

            // Merge existing (not removed) with new images
            const keptExisting = existing_images.filter(url => !removed_images.includes(url));
            updates.image_urls = [...keptExisting, ...newImages];

            // Delete removed images from filesystem
            if (removed_images.length > 0 && product.image_urls && Array.isArray(product.image_urls)) {
                removed_images.forEach(imgUrl => {
                    const oldPath = path.join(__dirname, '..', imgUrl);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                });
            }
        } else if (existing_images.length > 0 || removed_images.length > 0) {
            // No new images, but existing images were modified (some removed)
            const keptExisting = existing_images.filter(url => !removed_images.includes(url));
            updates.image_urls = keptExisting;

            // Delete removed images from filesystem
            if (removed_images.length > 0 && product.image_urls && Array.isArray(product.image_urls)) {
                removed_images.forEach(imgUrl => {
                    const oldPath = path.join(__dirname, '..', imgUrl);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                });
            }
        }

        // Basic Information
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (product_type) updates.product_type = product_type;

        // Pricing & Inventory
        if (price !== undefined) updates.price = price;
        if (deleted_price !== undefined) updates.deleted_price = deleted_price;
        if (discount_percentage !== undefined) updates.discount_percentage = discount_percentage;
        if (stock_quantity !== undefined) updates.stock_quantity = stock_quantity;
        if (minimum_order_quantity !== undefined) updates.minimum_order_quantity = minimum_order_quantity;

        // Livestock Specific
        if (breed !== undefined) updates.breed = breed;
        if (age_months !== undefined) updates.age_months = age_months;
        if (date_of_birth !== undefined) {
            updates.date_of_birth = date_of_birth;
            // Recalculate age
            updates.age_months = calculateProductAge(date_of_birth);
        }
        if (gender !== undefined) updates.gender = gender;
        if (weight_kg !== undefined) updates.weight_kg = weight_kg;
        if (height_cm !== undefined) updates.height_cm = height_cm;
        if (color_markings !== undefined) updates.color_markings = color_markings;

        // Health & Medical
        if (health_status !== undefined) updates.health_status = health_status;
        if (vaccination_records !== undefined) updates.vaccination_records = JSON.parse(vaccination_records);
        if (medical_history !== undefined) updates.medical_history = medical_history;
        if (veterinary_certificates !== undefined) updates.veterinary_certificates = JSON.parse(veterinary_certificates);
        if (last_health_checkup !== undefined) updates.last_health_checkup = last_health_checkup;

        // Genetics & Performance
        if (genetic_traits !== undefined) updates.genetic_traits = genetic_traits;
        if (milk_production_liters_per_day !== undefined) updates.milk_production_liters_per_day = milk_production_liters_per_day;
        if (breeding_history !== undefined) updates.breeding_history = breeding_history;
        if (offspring_count !== undefined) updates.offspring_count = offspring_count;

        // Location & Logistics
        if (location !== undefined) updates.location = location;
        if (latitude !== undefined) updates.latitude = latitude;
        if (longitude !== undefined) updates.longitude = longitude;
        if (shipping_available !== undefined) updates.shipping_available = shipping_available;
        if (delivery_timeframe_days !== undefined) updates.delivery_timeframe_days = delivery_timeframe_days;
        if (pickup_available !== undefined) updates.pickup_available = pickup_available;

        // Certifications & Compliance
        if (certificate_urls !== undefined) updates.certificate_urls = JSON.parse(certificate_urls);
        if (license_numbers !== undefined) updates.license_numbers = JSON.parse(license_numbers);
        if (organic_certified !== undefined) updates.organic_certified = organic_certified;

        // Media
        if (video_urls !== undefined) updates.video_urls = JSON.parse(video_urls);
        if (youtube_video_url !== undefined) updates.youtube_video_url = youtube_video_url;
        if (social_media_links !== undefined) updates.social_media_links = typeof social_media_links === 'string' ? JSON.parse(social_media_links) : social_media_links;

        // Marketplace Features
        if (tags !== undefined) updates.tags = tags;

        // Metadata
        if (metadata !== undefined) updates.metadata = metadata;

        // Status handling: Admins can set status directly, sellers set to Pending
        if (user_role === 'Admin' && req.body.status) {
            updates.status = req.body.status;
        } else if (user_role !== 'Admin') {
            // Non-admin updates require re-approval
            updates.status = 'Pending';
        }

        await product.update(updates);

        const message = user_role === 'Admin'
            ? 'Product updated successfully'
            : 'Product updated successfully, pending approval';

        return sendSuccess(res, 200, message, {
            product_id: product.product_id,
            status: product.status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete product (Seller only - own products, or Admin - any product)
 * DELETE /api/v1/seller/products/:id or DELETE /api/v1/admin/products/:id
 */
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.user_id;
        const user_role = req.user.role;

        const product = await Product.findByPk(id);

        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        // Ensure seller owns the product (unless user is Admin)
        if (user_role !== 'Admin' && product.seller_id !== user_id) {
            return sendError(res, 403, 'You can only delete your own products');
        }

        await product.destroy();

        return sendSuccess(res, 200, 'Product deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get seller's products
 * GET /api/v1/seller/products
 */
const getSellerProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            availability_status
        } = req.query;

        const seller_id = req.user.user_id;
        const offset = (page - 1) * limit;

        const where = { seller_id };
        const { Op } = require('sequelize');

        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        if (status) {
            where.status = status;
        }

        if (availability_status) {
            where.availability_status = availability_status;
        }

        const products = await Product.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: ProductSubcategory,
                    as: 'subcategory',
                    attributes: ['sub_cat_id', 'name', 'slug'],
                    include: [
                        {
                            model: ProductCategory,
                            as: 'category',
                            attributes: ['cat_id', 'name', 'slug']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const formattedProducts = products.rows.map(product => formatProductResponse(product));

        return sendSuccess(res, 200, 'Products retrieved successfully', {
            products: formattedProducts,
            pagination: {
                total: products.count,
                page: parseInt(page),
                pages: Math.ceil(products.count / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create product with Qercha package (Admin only)
 * POST /api/v1/admin/products/with-qercha
 * Creates both product and qercha package in a single atomic transaction
 */
const createProductWithQercha = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            // Basic Information
            name, description, product_type, sub_cat_id,
            // Pricing & Inventory
            price, deleted_price, discount_percentage, currency,
            stock_quantity, minimum_order_quantity,
            // Livestock Specific
            breed, age_months, date_of_birth, gender, weight_kg,
            height_cm, color_markings, mother_id, father_id,
            // Health & Medical
            health_status, vaccination_records, medical_history,
            veterinary_certificates, last_health_checkup,
            // Genetics & Performance
            genetic_traits, milk_production_liters_per_day,
            breeding_history, offspring_count,
            // Location & Logistics
            location, latitude, longitude, shipping_available,
            delivery_timeframe_days, pickup_available,
            // Certifications & Compliance
            certificate_urls, license_numbers, organic_certified,
            // Marketplace Features
            featured, tags,
            // Media
            video_urls, youtube_video_url, social_media_links,
            // Metadata
            metadata,
            // Admin-only: seller_id
            seller_id: provided_seller_id,
            // Qercha fields
            create_qercha,
            total_shares,
            start_date,
            expiry_date
        } = req.body;

        const user_id = req.user.user_id;

        // Determine seller_id: Admin can specify, or use their own
        let seller_id = provided_seller_id || user_id;
        const specifiedSeller = await User.findByPk(seller_id, { transaction });
        if (!specifiedSeller) {
            await transaction.rollback();
            return sendError(res, 400, 'Specified seller does not exist');
        }

        // Handle uploaded images with compression
        let image_urls = [];
        if (req.files && req.files.length > 0) {
            image_urls = await compressMultipleImages(req.files, {
                width: 1200,
                height: 1200,
                quality: 85
            });
        }

        // Generate unique SKU
        const sku = generateProductSKU('LVS');

        // Calculate age from date_of_birth if not provided
        const calculatedAge = age_months || (date_of_birth ? calculateProductAge(date_of_birth) : null);

        // Create product with Live status (admin-created = auto-approved)
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
            // Auto-approve for admin with qercha (must be Live for qercha)
            status: 'Live',
            availability_status: 'available'
        }, { transaction });

        let qerchaPackage = null;

        // Create Qercha package if requested
        const shouldCreateQercha = create_qercha === 'true' || create_qercha === true;
        if (shouldCreateQercha) {
            const sharesCount = parseInt(total_shares) || 4;

            if (sharesCount < 2) {
                await transaction.rollback();
                return sendError(res, 400, 'Qercha package requires at least 2 shares');
            }

            qerchaPackage = await QerchaPackage.create({
                ox_product_id: product.product_id,
                total_shares: sharesCount,
                shares_available: sharesCount,
                host_user_id: user_id,
                status: 'Active',
                start_date: start_date || null,
                expiry_date: expiry_date || null
            }, { transaction });
        }

        await transaction.commit();

        const response = {
            product_id: product.product_id,
            sku: product.sku,
            status: product.status
        };

        if (qerchaPackage) {
            response.qercha_package = {
                package_id: qerchaPackage.package_id,
                total_shares: qerchaPackage.total_shares
            };
        }

        return sendSuccess(res, 201,
            qerchaPackage
                ? 'Product and Qercha package created successfully'
                : 'Product created successfully',
            response
        );
    } catch (error) {
        await transaction.rollback();
        // Clean up uploaded files if creation fails
        if (req.files) {
            req.files.forEach(file => {
                const filePath = path.join(process.env.UPLOAD_DIR || './uploads', 'compressed', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
        next(error);
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getSellerProducts,
    createProductWithQercha
};
