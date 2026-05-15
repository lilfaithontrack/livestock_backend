const { ProductReview, Order, OrderItem, Product, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { updateProductRating } = require('../utils/productHelpers');
const sequelize = require('../config/database');

async function refreshSellerRating(sellerId) {
    const agg = await ProductReview.findOne({
        where: { seller_id: sellerId },
        attributes: [
            [sequelize.fn('AVG', sequelize.col('rating')), 'avg'],
            [sequelize.fn('COUNT', sequelize.col('review_id')), 'cnt']
        ],
        raw: true
    });
    const avg = agg?.avg != null ? parseFloat(Number(agg.avg).toFixed(2)) : null;
    const cnt = agg?.cnt != null ? parseInt(agg.cnt, 10) : 0;
    await User.update(
        { seller_rating_avg: avg, seller_rating_count: cnt },
        { where: { user_id: sellerId } }
    );
}

/**
 * POST /api/v1/reviews
 * Buyer only — order must be Delivered and paid (optional strict paid check)
 */
const createReview = async (req, res, next) => {
    try {
        const buyer_id = req.user.user_id;
        const { order_id, product_id, rating, comment } = req.body;

        if (!order_id || !product_id || !rating) {
            return sendError(res, 400, 'order_id, product_id, and rating are required');
        }
        const r = parseInt(rating, 10);
        if (Number.isNaN(r) || r < 1 || r > 5) {
            return sendError(res, 400, 'rating must be between 1 and 5');
        }

        const order = await Order.findByPk(order_id);

        if (!order || order.buyer_id !== buyer_id) {
            return sendError(res, 404, 'Order not found');
        }

        if (order.order_status !== 'Delivered') {
            return sendError(res, 400, 'You can only review after the order is delivered');
        }

        const item = await OrderItem.findOne({ where: { order_id, product_id } });
        if (!item) {
            return sendError(res, 400, 'This product is not part of this order');
        }

        const product = await Product.findByPk(product_id);
        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        const seller_id = product.seller_id;

        const existing = await ProductReview.findOne({ where: { order_id, product_id } });
        if (existing) {
            return sendError(res, 400, 'You already reviewed this purchase');
        }

        const review = await ProductReview.create({
            product_id,
            seller_id,
            buyer_id,
            order_id,
            rating: r,
            comment: comment || null
        });

        const { rating: newAvg, review_count: newCount } = updateProductRating(
            parseFloat(product.rating) || 0,
            product.review_count || 0,
            r
        );

        await product.update({
            rating: newAvg,
            review_count: newCount
        });

        await refreshSellerRating(seller_id);

        return sendSuccess(res, 201, 'Review submitted', { review });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return sendError(res, 400, 'You already reviewed this purchase');
        }
        next(error);
    }
};

const listProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const { rows, count } = await ProductReview.findAndCountAll({
            where: { product_id: productId },
            include: [
                { model: User, as: 'buyer', attributes: ['user_id', 'phone', 'email'] }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return sendSuccess(res, 200, 'Reviews loaded', {
            reviews: rows,
            pagination: { total: count, page, pages: Math.ceil(count / limit), limit }
        });
    } catch (error) {
        next(error);
    }
};

const listSellerReviews = async (req, res, next) => {
    try {
        const { sellerId } = req.params;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const { rows, count } = await ProductReview.findAndCountAll({
            where: { seller_id: sellerId },
            include: [
                { model: Product, as: 'product', attributes: ['product_id', 'name', 'image_urls'] },
                { model: User, as: 'buyer', attributes: ['user_id', 'phone'] }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return sendSuccess(res, 200, 'Seller reviews loaded', {
            reviews: rows,
            pagination: { total: count, page, pages: Math.ceil(count / limit), limit }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReview,
    listProductReviews,
    listSellerReviews,
    refreshSellerRating
};
