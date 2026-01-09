const { ProductCategory, ProductSubcategory, Product } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { compressImage, compressMultipleImages } = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

// ==================== CATEGORY CRUD ====================

/**
 * Get all categories with search and filters  
 * GET /api/v1/categories?search=cattle&is_active=true
 */
const getCategories = async (req, res, next) => {
    try {
        const { search, is_active, include_stats } = req.query;

        // Build where clause
        const where = {};

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        const categories = await ProductCategory.findAll({
            where,
            include: [
                {
                    model: ProductSubcategory,
                    as: 'subcategories',
                    where: { is_active: true },
                    required: false
                }
            ],
            order: [
                ['display_order', 'ASC'],
                ['created_at', 'DESC']
            ]
        });

        // Add product count statistics if requested
        let categoriesWithStats = categories;
        if (include_stats === 'true') {
            categoriesWithStats = await Promise.all(categories.map(async (category) => {
                const categoryData = category.toJSON();

                // Count products in this category
                const productCount = await Product.count({
                    include: [{
                        model: ProductSubcategory,
                        as: 'subcategory',
                        where: { cat_id: category.cat_id },
                        required: true
                    }]
                });

                categoryData.product_count = productCount;
                return categoryData;
            }));
        }

        return sendSuccess(res, 200, 'Categories retrieved successfully', {
            categories: include_stats === 'true' ? categoriesWithStats : categories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get category by ID
 * GET /api/v1/categories/:id
 */
const getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { include_stats } = req.query;

        const category = await ProductCategory.findByPk(id, {
            include: [
                {
                    model: ProductSubcategory,
                    as: 'subcategories'
                }
            ]
        });

        if (!category) {
            return sendError(res, 404, 'Category not found');
        }

        let categoryData = category.toJSON();

        // Add statistics if requested
        if (include_stats === 'true') {
            const productCount = await Product.count({
                include: [{
                    model: ProductSubcategory,
                    as: 'subcategory',
                    where: { cat_id: id },
                    required: true
                }]
            });

            categoryData.product_count = productCount;
        }

        return sendSuccess(res, 200, 'Category retrieved successfully', { category: categoryData });
    } catch (error) {
        next(error);
    }
};

/**
 * Create category (Admin only) - supports multiple images
 * POST /api/v1/admin/categories
 */
const createCategory = async (req, res, next) => {
    try {
        const { name, description, slug, icon_url, display_order, is_active, metadata } = req.body;

        if (!name) {
            return sendError(res, 400, 'Category name is required');
        }

        // Handle uploaded images (multiple support)
        let image_urls = [];
        let image_url = null;

        console.log('Category creation - Files received:', req.files ? req.files.length : 0);
        console.log('Category creation - Files details:', req.files ? req.files.map(f => ({ filename: f.filename, originalname: f.originalname, mimetype: f.mimetype })) : 'none');
        console.log('Category creation - Body keys:', Object.keys(req.body));

        if (req.files && req.files.length > 0) {
            try {
                console.log('Processing', req.files.length, 'uploaded file(s)');
                console.log('File details:', req.files.map(f => ({
                    filename: f.filename,
                    path: f.path,
                    originalname: f.originalname,
                    mimetype: f.mimetype,
                    size: f.size
                })));
                
                // Compress all uploaded images
                const compressedUrls = await compressMultipleImages(req.files, {
                    width: 800,
                    height: 800,
                    quality: 80
                });
                console.log('Compressed URLs returned:', compressedUrls);
                console.log('Compressed URLs type:', typeof compressedUrls);
                console.log('Compressed URLs is array:', Array.isArray(compressedUrls));
                
                image_urls = compressedUrls || [];
                // Use first image as main image_url
                image_url = image_urls.length > 0 ? image_urls[0] : null;
                console.log('Final image_url:', image_url);
                
                if (!image_url) {
                    console.error('WARNING: image_url is null after compression!');
                    console.error('Compressed URLs:', compressedUrls);
                    // Try fallback
                    image_url = req.files[0] ? `/uploads/compressed/${req.files[0].filename}` : null;
                    console.log('Fallback image_url:', image_url);
                }
            } catch (compressionError) {
                console.error('Image compression failed:', compressionError);
                console.error('Compression error stack:', compressionError.stack);
                // Fall back to original files if compression fails
                image_url = req.files[0] ? `/uploads/${req.files[0].filename}` : null;
                console.log('Fallback image_url after error:', image_url);
            }
        } else {
            console.log('No files received in req.files');
            console.log('req.files value:', req.files);
        }

        const category = await ProductCategory.create({
            name,
            description,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            image_url,
            icon_url,
            display_order: display_order || 0,
            is_active: is_active !== undefined ? is_active : true,
            metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {}
        });

        return sendSuccess(res, 201, 'Category created successfully', { category });
    } catch (error) {
        console.error('Category creation error:', error);
        // Clean up uploaded files if creation fails
        if (req.files) {
            req.files.forEach(file => {
                const filePath = path.join(process.env.UPLOAD_DIR || './uploads', file.filename);
                const compressedPath = path.join(process.env.UPLOAD_DIR || './uploads', 'compressed', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                if (fs.existsSync(compressedPath)) {
                    fs.unlinkSync(compressedPath);
                }
            });
        }
        next(error);
    }
};

/**
 * Update category (Admin only)
 * PUT /api/v1/admin/categories/:id
 */
const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, slug, icon_url, display_order, is_active, metadata } = req.body;

        const category = await ProductCategory.findByPk(id);

        if (!category) {
            return sendError(res, 404, 'Category not found');
        }

        // Handle uploaded images
        let image_url = category.image_url;
        
        console.log('Category update - Files received:', req.files ? req.files.length : 0);
        console.log('Category update - Files details:', req.files);
        console.log('Category update - Current image_url:', category.image_url);
        
        if (req.files && req.files.length > 0) {
            try {
                console.log('Processing', req.files.length, 'uploaded file(s) for update');
                // Delete old image if exists
                if (category.image_url) {
                    const oldFilePath = path.join(__dirname, '..', category.image_url);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                        console.log('Deleted old image:', oldFilePath);
                    }
                }

                // Compress new images
                const compressedUrls = await compressMultipleImages(req.files, {
                    width: 800,
                    height: 800,
                    quality: 80
                });
                console.log('Compressed URLs:', compressedUrls);
                image_url = compressedUrls.length > 0 ? compressedUrls[0] : category.image_url;
                console.log('New image_url:', image_url);
            } catch (compressionError) {
                console.error('Image compression failed during update:', compressionError);
                console.error('Compression error stack:', compressionError.stack);
                // Keep existing image_url if compression fails
                console.log('Keeping existing image_url due to compression error');
            }
        } else {
            console.log('No files received for update, keeping existing image_url:', image_url);
        }

        // Update category
        await category.update({
            name: name || category.name,
            description: description !== undefined ? description : category.description,
            slug: slug || category.slug,
            image_url,
            icon_url: icon_url !== undefined ? icon_url : category.icon_url,
            display_order: display_order !== undefined ? display_order : category.display_order,
            is_active: is_active !== undefined ? is_active : category.is_active,
            metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : category.metadata
        });

        return sendSuccess(res, 200, 'Category updated successfully', { category });
    } catch (error) {
        // Clean up uploaded files if update fails
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
 * Delete category (Admin only)
 * DELETE /api/v1/admin/categories/:id
 */
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const category = await ProductCategory.findByPk(id, {
            include: [{ model: ProductSubcategory, as: 'subcategories' }]
        });

        if (!category) {
            return sendError(res, 404, 'Category not found');
        }

        // Check if category has subcategories
        if (category.subcategories && category.subcategories.length > 0) {
            return sendError(res, 400, 'Cannot delete category with existing subcategories');
        }

        // Delete image file if exists
        if (category.image_url) {
            const filePath = path.join(__dirname, '..', category.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await category.destroy();

        return sendSuccess(res, 200, 'Category deleted successfully', {});
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk reorder categories
 * PUT /api/v1/admin/categories/reorder
 * Body: { orders: [{ cat_id: 'uuid', display_order: 1 }, ...] }
 */
const reorderCategories = async (req, res, next) => {
    try {
        const { orders } = req.body;

        if (!orders || !Array.isArray(orders)) {
            return sendError(res, 400, 'Orders array is required');
        }

        // Update each category's display_order
        const updatePromises = orders.map(async (item) => {
            const { cat_id, display_order } = item;

            const category = await ProductCategory.findByPk(cat_id);
            if (category) {
                await category.update({ display_order });
            }
        });

        await Promise.all(updatePromises);

        return sendSuccess(res, 200, 'Categories reordered successfully', {});
    } catch (error) {
        next(error);
    }
};

/**
 * Get category statistics
 * GET /api/v1/admin/categories/statistics
 */
const getCategoryStatistics = async (req, res, next) => {
    try {
        const categories = await ProductCategory.findAll({
            include: [
                {
                    model: ProductSubcategory,
                    as: 'subcategories',
                    include: [
                        {
                            model: Product,
                            as: 'products',
                            attributes: []
                        }
                    ]
                }
            ]
        });

        const statistics = await Promise.all(categories.map(async (category) => {
            const categoryData = category.toJSON();

            // Count total products in this category
            const productCount = await Product.count({
                include: [{
                    model: ProductSubcategory,
                    as: 'subcategory',
                    where: { cat_id: category.cat_id },
                    required: true
                }]
            });

            // Count live products
            const liveProductCount = await Product.count({
                where: { status: 'Live' },
                include: [{
                    model: ProductSubcategory,
                    as: 'subcategory',
                    where: { cat_id: category.cat_id },
                    required: true
                }]
            });

            return {
                cat_id: category.cat_id,
                name: category.name,
                subcategory_count: category.subcategories.length,
                product_count: productCount,
                live_product_count: liveProductCount,
                is_active: category.is_active
            };
        }));

        return sendSuccess(res, 200, 'Category statistics retrieved successfully', { statistics });
    } catch (error) {
        next(error);
    }
};

// ==================== SUBCATEGORY CRUD ====================

/**
 * Get subcategories by category with search and filters
 * GET /api/v1/categories/:catId/subcategories?search=dairy&is_active=true
 */
const getSubcategories = async (req, res, next) => {
    try {
        const { catId } = req.params;
        const { search, is_active, include_stats } = req.query;

        const where = { cat_id: catId };

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        const subcategories = await ProductSubcategory.findAll({
            where,
            order: [
                ['display_order', 'ASC'],
                ['created_at', 'DESC']
            ]
        });

        // Add product count statistics if requested
        let subcategoriesWithStats = subcategories;
        if (include_stats === 'true') {
            subcategoriesWithStats = await Promise.all(subcategories.map(async (subcategory) => {
                const subcatData = subcategory.toJSON();

                const productCount = await Product.count({
                    where: { sub_cat_id: subcategory.sub_cat_id }
                });

                subcatData.product_count = productCount;
                return subcatData;
            }));
        }

        return sendSuccess(res, 200, 'Subcategories retrieved successfully', {
            subcategories: include_stats === 'true' ? subcategoriesWithStats : subcategories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get subcategory by ID
 * GET /api/v1/subcategories/:id
 */
const getSubcategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { include_stats } = req.query;

        const subcategory = await ProductSubcategory.findByPk(id, {
            include: [
                {
                    model: ProductCategory,
                    as: 'category'
                }
            ]
        });

        if (!subcategory) {
            return sendError(res, 404, 'Subcategory not found');
        }

        let subcatData = subcategory.toJSON();

        // Add statistics if requested
        if (include_stats === 'true') {
            const productCount = await Product.count({
                where: { sub_cat_id: id }
            });

            subcatData.product_count = productCount;
        }

        return sendSuccess(res, 200, 'Subcategory retrieved successfully', { subcategory: subcatData });
    } catch (error) {
        next(error);
    }
};

/**
 * Create subcategory (Admin only) - supports multiple images
 * POST /api/v1/admin/subcategories
 */
const createSubcategory = async (req, res, next) => {
    try {
        const { cat_id, name, description, slug, display_order, is_active, metadata } = req.body;

        if (!cat_id || !name) {
            return sendError(res, 400, 'Category ID and subcategory name are required');
        }

        // Verify category exists
        const category = await ProductCategory.findByPk(cat_id);
        if (!category) {
            return sendError(res, 404, 'Parent category not found');
        }

        // Handle uploaded images (multiple support)
        let image_urls = [];
        if (req.files && req.files.length > 0) {
            const compressedUrls = await compressMultipleImages(req.files, {
                width: 600,
                height: 600,
                quality: 80
            });
            image_urls = compressedUrls;
        }

        const image_url = image_urls.length > 0 ? image_urls[0] : null;

        const subcategory = await ProductSubcategory.create({
            cat_id,
            name,
            description,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            image_url,
            display_order: display_order || 0,
            is_active: is_active !== undefined ? is_active : true,
            metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {}
        });

        return sendSuccess(res, 201, 'Subcategory created successfully', { subcategory });
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
 * Update subcategory (Admin only)
 * PUT /api/v1/admin/subcategories/:id
 */
const updateSubcategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cat_id, name, description, slug, display_order, is_active, metadata } = req.body;

        const subcategory = await ProductSubcategory.findByPk(id);

        if (!subcategory) {
            return sendError(res, 404, 'Subcategory not found');
        }

        // Verify new category exists if changing parent
        if (cat_id && cat_id !== subcategory.cat_id) {
            const category = await ProductCategory.findByPk(cat_id);
            if (!category) {
                return sendError(res, 404, 'New parent category not found');
            }
        }

        // Handle uploaded images
        let image_url = subcategory.image_url;
        if (req.files && req.files.length > 0) {
            // Delete old image if exists
            if (subcategory.image_url) {
                const oldFilePath = path.join(__dirname, '..', subcategory.image_url);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            const compressedUrls = await compressMultipleImages(req.files, {
                width: 600,
                height: 600,
                quality: 80
            });
            image_url = compressedUrls[0];
        }

        // Update subcategory
        await subcategory.update({
            cat_id: cat_id || subcategory.cat_id,
            name: name || subcategory.name,
            description: description !== undefined ? description : subcategory.description,
            slug: slug || subcategory.slug,
            image_url,
            display_order: display_order !== undefined ? display_order : subcategory.display_order,
            is_active: is_active !== undefined ? is_active : subcategory.is_active,
            metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : subcategory.metadata
        });

        return sendSuccess(res, 200, 'Subcategory updated successfully', { subcategory });
    } catch (error) {
        // Clean up uploaded files if update fails
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
 * Delete subcategory (Admin only)
 * DELETE /api/v1/admin/subcategories/:id
 */
const deleteSubcategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const subcategory = await ProductSubcategory.findByPk(id);

        if (!subcategory) {
            return sendError(res, 404, 'Subcategory not found');
        }

        // Delete image file if exists
        if (subcategory.image_url) {
            const filePath = path.join(__dirname, '..', subcategory.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await subcategory.destroy();

        return sendSuccess(res, 200, 'Subcategory deleted successfully', {});
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk reorder subcategories
 * PUT /api/v1/admin/subcategories/reorder
 * Body: { orders: [{ sub_cat_id: 'uuid', display_order: 1 }, ...] }
 */
const reorderSubcategories = async (req, res, next) => {
    try {
        const { orders } = req.body;

        if (!orders || !Array.isArray(orders)) {
            return sendError(res, 400, 'Orders array is required');
        }

        // Update each subcategory's display_order
        const updatePromises = orders.map(async (item) => {
            const { sub_cat_id, display_order } = item;

            const subcategory = await ProductSubcategory.findByPk(sub_cat_id);
            if (subcategory) {
                await subcategory.update({ display_order });
            }
        });

        await Promise.all(updatePromises);

        return sendSuccess(res, 200, 'Subcategories reordered successfully', {});
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Categories
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getCategoryStatistics,

    // Subcategories
    getSubcategories,
    getSubcategoryById,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    reorderSubcategories
};
