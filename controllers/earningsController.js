const { SellerEarnings, SellerPlan, Order, User, Product } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get seller's earnings summary
exports.getEarningsSummary = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const totalEarnings = await SellerEarnings.sum('net_amount', {
            where: { seller_id }
        }) || 0;

        const availableBalance = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'available' }
        }) || 0;

        const pendingBalance = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'pending' }
        }) || 0;

        const withdrawnAmount = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'withdrawn' }
        }) || 0;

        const totalCommission = await SellerEarnings.sum('commission_amount', {
            where: { seller_id }
        }) || 0;

        const earningsCount = await SellerEarnings.count({
            where: { seller_id }
        });

        res.json({
            total_earnings: totalEarnings,
            available_balance: availableBalance,
            pending_balance: pendingBalance,
            withdrawn_amount: withdrawnAmount,
            total_commission_paid: totalCommission,
            total_orders: earningsCount
        });
    } catch (error) {
        console.error('Error fetching earnings summary:', error);
        res.status(500).json({ error: 'Failed to fetch earnings summary' });
    }
};

// Get available balance for withdrawal
exports.getAvailableBalance = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const availableBalance = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'available' }
        }) || 0;

        const availableEarnings = await SellerEarnings.findAll({
            where: { seller_id, status: 'available' },
            order: [['available_date', 'ASC']],
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['order_id', 'total_amount', 'order_status']
                }
            ]
        });

        res.json({
            available_balance: availableBalance,
            earnings: availableEarnings
        });
    } catch (error) {
        console.error('Error fetching available balance:', error);
        res.status(500).json({ error: 'Failed to fetch available balance' });
    }
};

// Get earnings history
exports.getEarningsHistory = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { status, limit = 20, offset = 0 } = req.query;

        const whereClause = { seller_id };
        if (status) {
            whereClause.status = status;
        }

        const { count, rows: earnings } = await SellerEarnings.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['order_id', 'total_amount', 'order_status', 'created_at']
                }
            ]
        });

        res.json({
            earnings,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching earnings history:', error);
        res.status(500).json({ error: 'Failed to fetch earnings history' });
    }
};

// Create earning record (called when order is completed)
exports.createEarning = async (order_id, seller_id, order_amount, transaction = null) => {
    try {
        // Get seller's current plan
        const sellerPlan = await SellerPlan.findOne({
            where: {
                seller_id,
                is_active: true,
                payment_status: 'paid'
            },
            transaction
        });

        // Determine commission rate based on plan (default 0% if no plan)
        let commissionRate = 0;
        if (sellerPlan) {
            if (sellerPlan.plan_type === 'commission') {
                commissionRate = parseFloat(sellerPlan.commission_rate) || 15;
            } else if (sellerPlan.plan_type === 'subscription') {
                commissionRate = parseFloat(sellerPlan.commission_rate) || 0;
            }
        } else {
            console.warn(`Seller ${seller_id} has no active plan — creating earning with 0% commission`);
        }

        const commissionAmount = (order_amount * commissionRate) / 100;
        const netAmount = order_amount - commissionAmount;

        // Set available date (e.g., 7 days after order completion)
        const availableDate = new Date();
        availableDate.setDate(availableDate.getDate() + 7);

        const earning = await SellerEarnings.create({
            seller_id,
            order_id,
            order_amount,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            net_amount: netAmount,
            status: 'pending',
            available_date: availableDate
        }, { transaction });

        return earning;
    } catch (error) {
        console.error('Error creating earning record:', error);
        throw error;
    }
};

// Make pending earnings available (scheduled job)
exports.makeEarningsAvailable = async () => {
    try {
        const now = new Date();

        const result = await SellerEarnings.update(
            { status: 'available' },
            {
                where: {
                    status: 'pending',
                    available_date: { [Op.lte]: now }
                }
            }
        );

        console.log(`Made ${result[0]} earnings available`);
        return result[0];
    } catch (error) {
        console.error('Error making earnings available:', error);
        throw error;
    }
};

// Backfill earnings for paid orders that don't have earning records
exports.backfillEarnings = async (req, res) => {
    try {
        // Find all paid orders that don't have corresponding earnings
        const paidOrders = await Order.findAll({
            where: { payment_status: 'Paid' },
            include: [{
                model: require('../models').OrderItem,
                as: 'items',
                include: [{ model: require('../models').Product, as: 'product' }]
            }]
        });

        let created = 0;
        let skipped = 0;
        const now = new Date();

        for (const order of paidOrders) {
            // Group items by seller
            const sellerTotals = {};
            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    if (item.seller_id) {
                        const itemTotal = parseFloat(item.unit_price) * parseInt(item.quantity);
                        sellerTotals[item.seller_id] = (sellerTotals[item.seller_id] || 0) + itemTotal;
                    }
                }
            }

            for (const sellerId in sellerTotals) {
                // Check if earning already exists for this order+seller
                const existing = await SellerEarnings.findOne({
                    where: { order_id: order.order_id, seller_id: sellerId }
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                try {
                    const orderAmount = sellerTotals[sellerId];

                    // Get seller's plan for commission rate
                    const sellerPlan = await SellerPlan.findOne({
                        where: { seller_id: sellerId, is_active: true, payment_status: 'paid' }
                    });

                    let commissionRate = 0;
                    if (sellerPlan) {
                        if (sellerPlan.plan_type === 'commission') {
                            commissionRate = parseFloat(sellerPlan.commission_rate) || 15;
                        } else if (sellerPlan.plan_type === 'subscription') {
                            commissionRate = parseFloat(sellerPlan.commission_rate) || 0;
                        }
                    }

                    const commissionAmount = (orderAmount * commissionRate) / 100;
                    const netAmount = orderAmount - commissionAmount;

                    // Use order date + 7 days as available date
                    const orderDate = new Date(order.created_at || order.createdAt);
                    const availableDate = new Date(orderDate);
                    availableDate.setDate(availableDate.getDate() + 7);

                    // If available_date is in the past, mark as 'available' directly
                    const status = availableDate <= now ? 'available' : 'pending';

                    await SellerEarnings.create({
                        seller_id: sellerId,
                        order_id: order.order_id,
                        order_amount: orderAmount,
                        commission_rate: commissionRate,
                        commission_amount: commissionAmount,
                        net_amount: netAmount,
                        status,
                        available_date: availableDate
                    });

                    created++;
                } catch (err) {
                    console.error(`Backfill failed for order ${order.order_id}, seller ${sellerId}:`, err.message);
                }
            }
        }

        console.log(`Backfill complete: ${created} earnings created, ${skipped} skipped (already exist)`);
        res.json({
            success: true,
            message: `Backfill complete: ${created} earnings created, ${skipped} already existed`,
            created,
            skipped
        });
    } catch (error) {
        console.error('Error backfilling earnings:', error);
        res.status(500).json({ error: 'Failed to backfill earnings' });
    }
};

// Admin: Get all earnings stats
exports.getAllEarningsStats = async (req, res) => {
    try {
        const totalEarnings = await SellerEarnings.sum('net_amount') || 0;
        const totalCommission = await SellerEarnings.sum('commission_amount') || 0;
        const totalOrderAmount = await SellerEarnings.sum('order_amount') || 0;

        const pendingAmount = await SellerEarnings.sum('net_amount', {
            where: { status: 'pending' }
        }) || 0;

        const availableAmount = await SellerEarnings.sum('net_amount', {
            where: { status: 'available' }
        }) || 0;

        const withdrawnAmount = await SellerEarnings.sum('net_amount', {
            where: { status: 'withdrawn' }
        }) || 0;

        const earningsCount = await SellerEarnings.count();

        // Get top sellers by earnings
        const topSellers = await SellerEarnings.findAll({
            attributes: [
                'seller_id',
                [sequelize.fn('SUM', sequelize.col('net_amount')), 'total_earnings'],
                [sequelize.fn('COUNT', sequelize.col('earning_id')), 'order_count']
            ],
            group: ['seller_id'],
            order: [[sequelize.fn('SUM', sequelize.col('net_amount')), 'DESC']],
            limit: 10,
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone', 'address']
                }
            ]
        });

        res.json({
            total_seller_earnings: totalEarnings,
            total_commission_collected: totalCommission,
            total_order_amount: totalOrderAmount,
            pending_amount: pendingAmount,
            available_amount: availableAmount,
            withdrawn_amount: withdrawnAmount,
            total_orders: earningsCount,
            top_sellers: topSellers
        });
    } catch (error) {
        console.error('Error fetching all earnings stats:', error);
        res.status(500).json({ error: 'Failed to fetch earnings statistics' });
    }
};

// Get seller dashboard stats (plan info + posts remaining)
exports.getSellerDashboard = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        // Get current plan
        const currentPlan = await SellerPlan.findOne({
            where: {
                seller_id,
                is_active: true,
                payment_status: 'paid'
            }
        });

        if (!currentPlan) {
            return res.json({
                has_plan: false,
                message: 'No active plan. Please select a plan to start selling.'
            });
        }

        // Get product count
        const productCount = await Product.count({
            where: {
                seller_id,
                status: { [Op.in]: ['Pending', 'Live'] }
            }
        });

        let dashboardData = {
            has_plan: true,
            plan_type: currentPlan.plan_type,
            plan_name: currentPlan.plan_name,
            is_active: currentPlan.is_active,
            current_products: productCount
        };

        // Always include earnings summary regardless of plan type
        const totalEarnings = await SellerEarnings.sum('net_amount', {
            where: { seller_id }
        }) || 0;

        const totalCommission = await SellerEarnings.sum('commission_amount', {
            where: { seller_id }
        }) || 0;

        const availableBalance = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'available' }
        }) || 0;

        const pendingBalance = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'pending' }
        }) || 0;

        const withdrawnAmount = await SellerEarnings.sum('net_amount', {
            where: { seller_id, status: 'withdrawn' }
        }) || 0;

        dashboardData.total_earnings = totalEarnings;
        dashboardData.total_commission_paid = totalCommission;
        dashboardData.available_balance = availableBalance;
        dashboardData.pending_balance = pendingBalance;
        dashboardData.withdrawn_amount = withdrawnAmount;

        if (currentPlan.plan_type === 'subscription') {
            dashboardData.max_products = currentPlan.max_products;
            dashboardData.posts_remaining = Math.max(0, currentPlan.max_products - productCount);
            dashboardData.posts_used_percentage = Math.round((productCount / currentPlan.max_products) * 100);
            dashboardData.subscription_end_date = currentPlan.subscription_end_date;
            dashboardData.can_post = productCount < currentPlan.max_products;

            // Check if subscription is expiring soon (within 7 days)
            const daysUntilExpiry = Math.ceil(
                (new Date(currentPlan.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            dashboardData.days_until_expiry = daysUntilExpiry;
            dashboardData.expiring_soon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
        } else {
            // Commission plan
            dashboardData.commission_rate = currentPlan.commission_rate;
            dashboardData.posts_remaining = 'unlimited';
            dashboardData.can_post = true;
        }

        res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching seller dashboard:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};
