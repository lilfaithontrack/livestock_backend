const { QerchaPackage, QerchaParticipant, Product, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const sequelize = require('../config/database');

/**
 * Create Qercha package
 * POST /api/v1/qercha/packages
 */
const createPackage = async (req, res, next) => {
    try {
        const { ox_product_id, total_shares, start_date, expiry_date } = req.body;
        const host_user_id = req.user.user_id;

        if (!ox_product_id || !total_shares || total_shares < 2) {
            return sendError(res, 400, 'Product ID and valid total shares (minimum 2) are required');
        }

        // Verify product exists and is Live
        const product = await Product.findByPk(ox_product_id);
        if (!product) {
            return sendError(res, 404, 'Product not found');
        }

        if (product.status !== 'Live') {
            return sendError(res, 400, 'Product must be approved before creating Qercha package');
        }

        const package = await QerchaPackage.create({
            ox_product_id,
            total_shares,
            shares_available: total_shares,
            host_user_id,
            status: 'Active',
            start_date: start_date || null,
            expiry_date: expiry_date || null
        });

        return sendSuccess(res, 201, 'Qercha package created successfully', {
            package_id: package.package_id,
            total_shares: package.total_shares
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Join Qercha package (purchase shares)
 * POST /api/v1/qercha/packages/:id/join
 */
const joinPackage = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { shares_purchased } = req.body;
        const user_id = req.user.user_id;

        if (!shares_purchased || shares_purchased < 1) {
            await transaction.rollback();
            return sendError(res, 400, 'Valid number of shares is required');
        }

        const package = await QerchaPackage.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                }
            ],
            transaction
        });

        if (!package) {
            await transaction.rollback();
            return sendError(res, 404, 'Qercha package not found');
        }

        if (package.status !== 'Active') {
            await transaction.rollback();
            return sendError(res, 400, 'This package is no longer active');
        }

        if (shares_purchased > package.shares_available) {
            await transaction.rollback();
            return sendError(res, 400, `Only ${package.shares_available} shares available`);
        }

        // Calculate amount based on product price
        const pricePerShare = parseFloat(package.product.price) / package.total_shares;
        const amount_paid = pricePerShare * shares_purchased;

        // Create participant
        const participant = await QerchaParticipant.create({
            package_id: package.package_id,
            user_id,
            shares_purchased,
            amount_paid,
            is_host: user_id === package.host_user_id
        }, { transaction });

        // Update available shares
        package.shares_available -= shares_purchased;

        // If all shares sold, mark as Completed
        if (package.shares_available === 0) {
            package.status = 'Completed';
        }

        await package.save({ transaction });

        await transaction.commit();

        return sendSuccess(res, 201, 'Successfully joined Qercha package', {
            participant_id: participant.participant_id,
            shares_purchased: participant.shares_purchased,
            amount_paid: participant.amount_paid,
            remaining_shares: package.shares_available
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get available Qercha packages
 * GET /api/v1/qercha/packages
 */
const getPackages = async (req, res, next) => {
    try {
        const packages = await QerchaPackage.findAll({
            where: { status: 'Active' },
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: User,
                    as: 'host',
                    attributes: ['user_id', 'phone', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return sendSuccess(res, 200, 'Qercha packages retrieved successfully', { packages });
    } catch (error) {
        next(error);
    }
};

/**
 * Get package details with participants
 * GET /api/v1/qercha/packages/:id
 */
const getPackageDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const package = await QerchaPackage.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: User,
                    as: 'host',
                    attributes: ['user_id', 'phone', 'email']
                },
                {
                    model: QerchaParticipant,
                    as: 'participants',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'phone']
                        }
                    ]
                }
            ]
        });

        if (!package) {
            return sendError(res, 404, 'Qercha package not found');
        }

        return sendSuccess(res, 200, 'Package details retrieved successfully', { package });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Qercha package status (Admin)
 * PUT /api/v1/qercha/:id/status
 */
const updatePackageStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Active', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return sendError(res, 400, 'Invalid status');
        }

        const package = await QerchaPackage.findByPk(id);
        if (!package) {
            return sendError(res, 404, 'Qercha package not found');
        }

        package.status = status;
        await package.save();

        return sendSuccess(res, 200, 'Package status updated', {
            package_id: package.package_id,
            status: package.status
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPackage,
    joinPackage,
    getPackages,
    getPackageDetails,
    updatePackageStatus
};
