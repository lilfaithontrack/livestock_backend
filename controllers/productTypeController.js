const { ProductType, ProductCategory, ProductSubcategory } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all product types (Public)
 * GET /api/v1/product-types
 */
const getAllProductTypes = async (req, res, next) => {
    try {
        const { include_inactive } = req.query;

        const where = {};
        if (!include_inactive) {
            where.is_active = true;
        }

        const productTypes = await ProductType.findAll({
            where,
            order: [['display_order', 'ASC'], ['name', 'ASC']],
            include: [
                {
                    model: ProductCategory,
                    as: 'categories',
                    where: { is_active: true },
                    required: false,
                    attributes: ['cat_id', 'name', 'slug', 'image_url', 'display_order']
                }
            ]
        });

        return sendSuccess(res, 200, 'Product types retrieved successfully', {
            product_types: productTypes,
            count: productTypes.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get product type by ID with categories (Public)
 * GET /api/v1/product-types/:id
 */
const getProductTypeById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const productType = await ProductType.findByPk(id, {
            include: [
                {
                    model: ProductCategory,
                    as: 'categories',
                    where: { is_active: true },
                    required: false,
                    include: [
                        {
                            model: ProductSubcategory,
                            as: 'subcategories',
                            where: { is_active: true },
                            required: false,
                            attributes: ['sub_cat_id', 'name', 'slug', 'image_url', 'display_order']
                        }
                    ],
                    order: [['display_order', 'ASC']]
                }
            ]
        });

        if (!productType) {
            return sendError(res, 404, 'Product type not found');
        }

        return sendSuccess(res, 200, 'Product type retrieved successfully', {
            product_type: productType
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get categories for a product type (Public)
 * GET /api/v1/product-types/:id/categories
 */
const getProductTypeCategories = async (req, res, next) => {
    try {
        const { id } = req.params;

        const productType = await ProductType.findByPk(id);
        if (!productType) {
            return sendError(res, 404, 'Product type not found');
        }

        const categories = await ProductCategory.findAll({
            where: {
                product_type_id: id,
                is_active: true
            },
            order: [['display_order', 'ASC'], ['name', 'ASC']],
            include: [
                {
                    model: ProductSubcategory,
                    as: 'subcategories',
                    where: { is_active: true },
                    required: false,
                    attributes: ['sub_cat_id', 'name', 'slug', 'image_url', 'display_order']
                }
            ]
        });

        return sendSuccess(res, 200, 'Categories retrieved successfully', {
            product_type: { type_id: productType.type_id, name: productType.name },
            categories,
            count: categories.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create product type (Admin only)
 * POST /api/v1/admin/product-types
 */
const createProductType = async (req, res, next) => {
    try {
        const { name, slug, description, icon_url, image_url, display_order, is_active, metadata } = req.body;

        if (!name) {
            return sendError(res, 400, 'Product type name is required');
        }

        // Check for existing type with same name
        const existingType = await ProductType.findOne({ where: { name } });
        if (existingType) {
            return sendError(res, 409, 'Product type with this name already exists');
        }

        const productType = await ProductType.create({
            name,
            slug,
            description,
            icon_url,
            image_url,
            display_order: display_order || 0,
            is_active: is_active !== undefined ? is_active : true,
            metadata: metadata || {}
        });

        return sendSuccess(res, 201, 'Product type created successfully', {
            product_type: productType
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update product type (Admin only)
 * PUT /api/v1/admin/product-types/:id
 */
const updateProductType = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, description, icon_url, image_url, display_order, is_active, metadata } = req.body;

        const productType = await ProductType.findByPk(id);
        if (!productType) {
            return sendError(res, 404, 'Product type not found');
        }

        // Check for duplicate name if changing
        if (name && name !== productType.name) {
            const existingType = await ProductType.findOne({ where: { name } });
            if (existingType) {
                return sendError(res, 409, 'Product type with this name already exists');
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (slug !== undefined) updates.slug = slug;
        if (description !== undefined) updates.description = description;
        if (icon_url !== undefined) updates.icon_url = icon_url;
        if (image_url !== undefined) updates.image_url = image_url;
        if (display_order !== undefined) updates.display_order = display_order;
        if (is_active !== undefined) updates.is_active = is_active;
        if (metadata !== undefined) updates.metadata = metadata;

        await productType.update(updates);

        return sendSuccess(res, 200, 'Product type updated successfully', {
            product_type: productType
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete product type (Admin only)
 * DELETE /api/v1/admin/product-types/:id
 */
const deleteProductType = async (req, res, next) => {
    try {
        const { id } = req.params;

        const productType = await ProductType.findByPk(id);
        if (!productType) {
            return sendError(res, 404, 'Product type not found');
        }

        // Check if there are categories using this type
        const categoriesCount = await ProductCategory.count({ where: { product_type_id: id } });
        if (categoriesCount > 0) {
            return sendError(res, 400, `Cannot delete. ${categoriesCount} categories are using this product type. Reassign or delete them first.`);
        }

        await productType.destroy();

        return sendSuccess(res, 200, 'Product type deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Assign categories to a product type (Admin only)
 * PUT /api/v1/admin/product-types/:id/categories
 * Body: { category_ids: ['uuid1', 'uuid2', ...] }
 */
const assignCategories = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category_ids } = req.body;

        const productType = await ProductType.findByPk(id);
        if (!productType) {
            return sendError(res, 404, 'Product type not found');
        }

        if (!category_ids || !Array.isArray(category_ids)) {
            return sendError(res, 400, 'category_ids must be an array');
        }

        // Update all specified categories to belong to this product type
        const [updatedCount] = await ProductCategory.update(
            { product_type_id: id },
            { where: { cat_id: category_ids } }
        );

        // Fetch updated categories
        const categories = await ProductCategory.findAll({
            where: { product_type_id: id },
            attributes: ['cat_id', 'name', 'slug', 'image_url'],
            order: [['display_order', 'ASC'], ['name', 'ASC']]
        });

        return sendSuccess(res, 200, `${updatedCount} categories assigned to product type`, {
            product_type: { type_id: productType.type_id, name: productType.name },
            categories,
            count: categories.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove category from product type (Admin only)
 * DELETE /api/v1/admin/product-types/:id/categories/:catId
 */
const removeCategoryFromType = async (req, res, next) => {
    try {
        const { id, catId } = req.params;

        const category = await ProductCategory.findOne({
            where: { cat_id: catId, product_type_id: id }
        });

        if (!category) {
            return sendError(res, 404, 'Category not found in this product type');
        }

        await category.update({ product_type_id: null });

        return sendSuccess(res, 200, 'Category removed from product type');
    } catch (error) {
        next(error);
    }
};

/**
 * Get all categories (for assigning to product types)
 * GET /api/v1/admin/product-types/available-categories
 */
const getAvailableCategories = async (req, res, next) => {
    try {
        const categories = await ProductCategory.findAll({
            attributes: ['cat_id', 'name', 'slug', 'image_url', 'product_type_id'],
            order: [['name', 'ASC']],
            include: [{
                model: ProductType,
                as: 'productType',
                attributes: ['type_id', 'name'],
                required: false
            }]
        });

        return sendSuccess(res, 200, 'Categories retrieved successfully', {
            categories,
            count: categories.length
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllProductTypes,
    getProductTypeById,
    getProductTypeCategories,
    createProductType,
    updateProductType,
    deleteProductType,
    assignCategories,
    removeCategoryFromType,
    getAvailableCategories
};
