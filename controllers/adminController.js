const { Product, User, Order, Delivery, ProductSubcategory, ProductCategory } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { formatProductResponse } = require('../utils/productHelpers');
const { Op } = require('sequelize');

/**
 * Get pending products for approval
 * GET /api/v1/admin/products/pending
 */
const getPendingProducts = async (req, res, next) => {
    try {
        const products = await Product.findAll({
            where: { status: 'Pending' },
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: [
                        'user_id',
                        'email',
                        'phone',
                        'kyc_status',
                        'trade_license_url',
                        'national_id_front_url',
                        'national_id_back_url',
                        'kyc_submitted_at',
                        'kyc_reviewed_at',
                        'kyc_rejection_reason'
                    ]
                }
            ],
            order: [['created_at', 'ASC']] // Oldest first
        });

        return sendSuccess(res, 200, 'Pending products retrieved successfully', { products });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve product
 * PUT /api/v1/admin/products/:id/approve
 */
const approveProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;

        const product = await Product.findByPk(id);

        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        if (product.status !== 'Pending') {
            return sendError(res, 400, 'Only pending products can be approved');
        }

        product.status = 'Live';
        product.admin_approved_by = admin_id;
        await product.save();

        // TODO: Send notification to seller

        return sendSuccess(res, 200, 'Product approved successfully', {
            product_id: product.product_id,
            status: product.status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject product
 * PUT /api/v1/admin/products/:id/reject
 */
const rejectProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;
        const admin_id = req.user.user_id;

        if (!rejection_reason) {
            return sendError(res, 400, 'Rejection reason is required');
        }

        const product = await Product.findByPk(id);

        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        if (product.status !== 'Pending') {
            return sendError(res, 400, 'Only pending products can be rejected');
        }

        product.status = 'Rejected';
        product.rejection_reason = rejection_reason;
        product.admin_approved_by = admin_id;
        await product.save();

        // TODO: Send notification to seller with reason

        return sendSuccess(res, 200, 'Product rejected', {
            product_id: product.product_id,
            status: product.status,
            rejection_reason: product.rejection_reason
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get dashboard statistics
 * GET /api/v1/admin/dashboard
 */
const getDashboardStats = async (req, res, next) => {
    try {
        // Count pending products
        const pendingProductsCount = await Product.count({
            where: { status: 'Pending' }
        });

        // Count pending sellers (KYC not approved)
        const pendingSellersCount = await User.count({
            where: {
                role: 'Seller',
                kyc_status: false
            }
        });

        // Count active deliveries
        const activeDeliveriesCount = await Delivery.count({
            where: {
                status: { [Op.in]: ['Assigned', 'In_Transit'] }
            }
        });

        // Calculate total sales (current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyOrders = await Order.findAll({
            where: {
                created_at: { [Op.gte]: startOfMonth },
                payment_status: 'Paid'
            }
        });

        const totalSalesMTD = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

        // Recent orders
        const recentOrders = await Order.findAll({
            limit: 10,
            include: [
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'phone', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Dashboard statistics retrieved successfully', {
            stats: {
                pending_products: pendingProductsCount,
                pending_sellers: pendingSellersCount,
                active_deliveries: activeDeliveriesCount,
                total_sales_mtd: totalSalesMTD.toFixed(2)
            },
            recent_orders: recentOrders
        });
    } catch (error) {
        next(error);
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: [
                'user_id',
                'role',
                'email',
                'phone',
                'kyc_status',
                'trade_license_url',
                'national_id_front_url',
                'national_id_back_url',
                'kyc_submitted_at',
                'kyc_reviewed_at',
                'kyc_rejection_reason',
                'created_at'
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Users retrieved successfully', { users });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all products (admin view)
 * GET /api/v1/admin/products
 */
const getAllProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            status,
            availability_status
        } = req.query;

        const offset = (page - 1) * limit;

        // Build where clause
        const where = {};

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
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone']
                },
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
 * Get all orders (admin view)
 * GET /api/v1/admin/orders
 */
const getAllOrders = async (req, res, next) => {
    try {
        const orders = await Order.findAll({
            include: [
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['user_id', 'phone', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Orders retrieved successfully', orders);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPendingProducts,
    approveProduct,
    rejectProduct,
    getDashboardStats,
    getAllUsers,
    getAllProducts,
    getAllOrders
};
