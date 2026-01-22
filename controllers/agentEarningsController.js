const { AgentEarnings, AgentPayout, Order, User, Delivery, DeliverySettings } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { calculateDistance } = require('../utils/geocoding');

// Calculate delivery fee based on distance
const calculateDeliveryFee = async (distanceKm) => {
    const settings = await DeliverySettings.getAllSettings();
    const baseFee = settings.base_delivery_fee || 50;
    const perKmRate = settings.per_km_rate || 10;
    const minFee = settings.min_delivery_fee || 30;
    
    let fee = baseFee + (distanceKm * perKmRate);
    return Math.max(fee, minFee);
};

// Calculate agent earnings from delivery fee
const calculateAgentEarnings = async (deliveryFee) => {
    const settings = await DeliverySettings.getAllSettings();
    const commissionRate = settings.platform_commission_rate || 15;
    const platformCommission = (deliveryFee * commissionRate) / 100;
    const netAmount = deliveryFee - platformCommission;
    
    return {
        deliveryFee,
        commissionRate,
        platformCommission,
        netAmount
    };
};

// Create earning record when delivery is completed
exports.createAgentEarning = async (orderId, agentId, deliveryId, distanceKm = null) => {
    try {
        const order = await Order.findByPk(orderId);
        if (!order) throw new Error('Order not found');

        // Calculate distance if not provided
        let distance = distanceKm;
        if (!distance && order.seller_location_lat && order.buyer_location_lat) {
            distance = calculateDistance(
                parseFloat(order.seller_location_lat),
                parseFloat(order.seller_location_lng),
                parseFloat(order.buyer_location_lat),
                parseFloat(order.buyer_location_lng)
            );
        }
        distance = distance || 5; // Default 5km if can't calculate

        // Calculate fees
        const deliveryFee = await calculateDeliveryFee(distance);
        const earnings = await calculateAgentEarnings(deliveryFee);
        const settings = await DeliverySettings.getAllSettings();

        // Set available date (instant for agents, or configurable)
        const availableDate = new Date();
        availableDate.setDate(availableDate.getDate() + 1); // Available next day

        const earning = await AgentEarnings.create({
            agent_id: agentId,
            order_id: orderId,
            delivery_id: deliveryId,
            delivery_fee: earnings.deliveryFee,
            platform_commission_rate: earnings.commissionRate,
            platform_commission: earnings.platformCommission,
            net_amount: earnings.netAmount,
            distance_km: distance,
            base_fee: settings.base_delivery_fee || 50,
            per_km_rate: settings.per_km_rate || 10,
            status: 'pending',
            available_date: availableDate
        });

        // Update order with delivery fee
        await order.update({
            delivery_fee: earnings.deliveryFee,
            delivery_distance_km: distance
        });

        // Update agent's total deliveries
        await User.increment('agent_total_deliveries', {
            by: 1,
            where: { user_id: agentId }
        });

        // Check for bonus eligibility
        const agent = await User.findByPk(agentId);
        const bonusThreshold = settings.agent_bonus_threshold || 10;
        const bonusAmount = settings.agent_bonus_amount || 100;
        
        if (agent.agent_total_deliveries % bonusThreshold === 0) {
            await earning.update({
                bonus_amount: bonusAmount,
                net_amount: parseFloat(earning.net_amount) + bonusAmount,
                notes: `Bonus for completing ${agent.agent_total_deliveries} deliveries`
            });
        }

        return earning;
    } catch (error) {
        console.error('Error creating agent earning:', error);
        throw error;
    }
};

// Get agent's earnings summary
exports.getAgentEarningsSummary = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;

        const totalEarnings = await AgentEarnings.sum('net_amount', {
            where: { agent_id }
        }) || 0;

        const availableBalance = await AgentEarnings.sum('net_amount', {
            where: { agent_id, status: 'available' }
        }) || 0;

        const pendingBalance = await AgentEarnings.sum('net_amount', {
            where: { agent_id, status: 'pending' }
        }) || 0;

        const withdrawnAmount = await AgentEarnings.sum('net_amount', {
            where: { agent_id, status: 'withdrawn' }
        }) || 0;

        const totalDeliveries = await AgentEarnings.count({
            where: { agent_id }
        });

        const totalDistance = await AgentEarnings.sum('distance_km', {
            where: { agent_id }
        }) || 0;

        const totalBonus = await AgentEarnings.sum('bonus_amount', {
            where: { agent_id }
        }) || 0;

        // Get agent info
        const agent = await User.findByPk(agent_id, {
            attributes: ['agent_total_deliveries', 'agent_rating', 'agent_rating_count', 
                        'agent_bank_name', 'agent_account_name', 'agent_account_number']
        });

        return sendSuccess(res, 200, 'Earnings summary retrieved', {
            total_earnings: parseFloat(totalEarnings),
            available_balance: parseFloat(availableBalance),
            pending_balance: parseFloat(pendingBalance),
            withdrawn_amount: parseFloat(withdrawnAmount),
            total_deliveries: totalDeliveries,
            total_distance_km: parseFloat(totalDistance),
            total_bonus: parseFloat(totalBonus),
            rating: parseFloat(agent?.agent_rating || 5),
            rating_count: agent?.agent_rating_count || 0,
            has_bank_account: !!(agent?.agent_bank_name && agent?.agent_account_number)
        });
    } catch (error) {
        next(error);
    }
};

// Get agent's earnings history
exports.getAgentEarningsHistory = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;
        const { status, limit = 20, offset = 0 } = req.query;

        const whereClause = { agent_id };
        if (status) whereClause.status = status;

        const { count, rows: earnings } = await AgentEarnings.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['order_id', 'total_amount', 'order_status', 'shipping_address', 'created_at']
                },
                {
                    model: Delivery,
                    as: 'delivery',
                    attributes: ['delivery_id', 'status', 'pickup_confirmed_at', 'delivery_confirmed_at']
                }
            ]
        });

        return sendSuccess(res, 200, 'Earnings history retrieved', {
            earnings,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        next(error);
    }
};

// Update agent bank account
exports.updateAgentBankAccount = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;
        const { bank_name, account_name, account_number } = req.body;

        if (!bank_name || !account_name || !account_number) {
            return sendError(res, 400, 'Bank name, account name, and account number are required');
        }

        await User.update({
            agent_bank_name: bank_name,
            agent_account_name: account_name,
            agent_account_number: account_number
        }, { where: { user_id: agent_id } });

        return sendSuccess(res, 200, 'Bank account updated successfully');
    } catch (error) {
        next(error);
    }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;
        const { amount } = req.body;

        // Get agent's bank info
        const agent = await User.findByPk(agent_id);
        if (!agent.agent_bank_name || !agent.agent_account_number) {
            return sendError(res, 400, 'Please add your bank account details first');
        }

        // Check available balance
        const availableBalance = await AgentEarnings.sum('net_amount', {
            where: { agent_id, status: 'available' }
        }) || 0;

        if (amount > availableBalance) {
            return sendError(res, 400, `Insufficient balance. Available: ETB ${availableBalance}`);
        }

        if (amount < 100) {
            return sendError(res, 400, 'Minimum withdrawal amount is ETB 100');
        }

        // Check for pending withdrawal
        const pendingPayout = await AgentPayout.findOne({
            where: { agent_id, status: { [Op.in]: ['Pending', 'Approved', 'Processing'] } }
        });
        if (pendingPayout) {
            return sendError(res, 400, 'You already have a pending withdrawal request');
        }

        // Create payout request
        const payout = await AgentPayout.create({
            agent_id,
            amount,
            bank_name: agent.agent_bank_name,
            account_name: agent.agent_account_name,
            account_number: agent.agent_account_number,
            status: 'Pending',
            request_date: new Date()
        });

        // Mark earnings as withdrawn (up to amount)
        let remainingAmount = parseFloat(amount);
        const availableEarnings = await AgentEarnings.findAll({
            where: { agent_id, status: 'available' },
            order: [['available_date', 'ASC']]
        });

        for (const earning of availableEarnings) {
            if (remainingAmount <= 0) break;
            
            const earningAmount = parseFloat(earning.net_amount);
            if (earningAmount <= remainingAmount) {
                await earning.update({ status: 'withdrawn', payout_id: payout.payout_id });
                remainingAmount -= earningAmount;
            }
        }

        return sendSuccess(res, 201, 'Withdrawal request submitted', {
            payout_id: payout.payout_id,
            amount: parseFloat(amount),
            status: 'Pending',
            bank_name: agent.agent_bank_name,
            account_number: agent.agent_account_number.slice(-4).padStart(agent.agent_account_number.length, '*')
        });
    } catch (error) {
        next(error);
    }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res, next) => {
    try {
        const agent_id = req.user.user_id;
        const { limit = 20, offset = 0 } = req.query;

        const { count, rows: payouts } = await AgentPayout.findAndCountAll({
            where: { agent_id },
            order: [['request_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return sendSuccess(res, 200, 'Withdrawal history retrieved', {
            payouts,
            total: count
        });
    } catch (error) {
        next(error);
    }
};

// Make pending earnings available (scheduled job)
exports.makeAgentEarningsAvailable = async () => {
    try {
        const now = new Date();
        const result = await AgentEarnings.update(
            { status: 'available' },
            {
                where: {
                    status: 'pending',
                    available_date: { [Op.lte]: now }
                }
            }
        );
        console.log(`Made ${result[0]} agent earnings available`);
        return result[0];
    } catch (error) {
        console.error('Error making agent earnings available:', error);
        throw error;
    }
};

// Admin: Get all agent earnings stats
exports.getAllAgentEarningsStats = async (req, res, next) => {
    try {
        const totalEarnings = await AgentEarnings.sum('net_amount') || 0;
        const totalPlatformCommission = await AgentEarnings.sum('platform_commission') || 0;
        const totalDeliveryFees = await AgentEarnings.sum('delivery_fee') || 0;
        const totalDeliveries = await AgentEarnings.count();
        const totalDistance = await AgentEarnings.sum('distance_km') || 0;

        const pendingPayouts = await AgentPayout.sum('amount', {
            where: { status: 'Pending' }
        }) || 0;

        const completedPayouts = await AgentPayout.sum('amount', {
            where: { status: 'Completed' }
        }) || 0;

        // Top agents by earnings
        const topAgents = await AgentEarnings.findAll({
            attributes: [
                'agent_id',
                [sequelize.fn('SUM', sequelize.col('net_amount')), 'total_earnings'],
                [sequelize.fn('COUNT', sequelize.col('earning_id')), 'delivery_count'],
                [sequelize.fn('SUM', sequelize.col('distance_km')), 'total_distance']
            ],
            group: ['agent_id'],
            order: [[sequelize.fn('SUM', sequelize.col('net_amount')), 'DESC']],
            limit: 10,
            include: [{
                model: User,
                as: 'agent',
                attributes: ['user_id', 'email', 'phone', 'agent_rating']
            }]
        });

        return sendSuccess(res, 200, 'Agent earnings stats retrieved', {
            total_agent_earnings: parseFloat(totalEarnings),
            total_platform_commission: parseFloat(totalPlatformCommission),
            total_delivery_fees: parseFloat(totalDeliveryFees),
            total_deliveries: totalDeliveries,
            total_distance_km: parseFloat(totalDistance),
            pending_payouts: parseFloat(pendingPayouts),
            completed_payouts: parseFloat(completedPayouts),
            top_agents: topAgents
        });
    } catch (error) {
        next(error);
    }
};

// Admin: Get pending payouts
exports.getPendingAgentPayouts = async (req, res, next) => {
    try {
        const { status = 'Pending', limit = 50, offset = 0 } = req.query;

        const { count, rows: payouts } = await AgentPayout.findAndCountAll({
            where: { status },
            order: [['request_date', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{
                model: User,
                as: 'agent',
                attributes: ['user_id', 'email', 'phone', 'agent_rating', 'agent_total_deliveries']
            }]
        });

        return sendSuccess(res, 200, 'Pending payouts retrieved', {
            payouts,
            total: count
        });
    } catch (error) {
        next(error);
    }
};

// Admin: Process payout
exports.processAgentPayout = async (req, res, next) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;
        const { action, transaction_reference, rejection_reason, payment_proof_url } = req.body;

        const payout = await AgentPayout.findByPk(id);
        if (!payout) {
            return sendError(res, 404, 'Payout not found');
        }

        if (payout.status !== 'Pending' && payout.status !== 'Approved') {
            return sendError(res, 400, `Cannot process payout with status: ${payout.status}`);
        }

        if (action === 'approve') {
            await payout.update({
                status: 'Approved',
                processed_by: admin_id
            });
            return sendSuccess(res, 200, 'Payout approved');
        }

        if (action === 'complete') {
            if (!transaction_reference) {
                return sendError(res, 400, 'Transaction reference is required');
            }
            await payout.update({
                status: 'Completed',
                processed_date: new Date(),
                processed_by: admin_id,
                transaction_reference,
                payment_proof_url
            });
            return sendSuccess(res, 200, 'Payout completed');
        }

        if (action === 'reject') {
            if (!rejection_reason) {
                return sendError(res, 400, 'Rejection reason is required');
            }
            
            // Revert earnings status
            await AgentEarnings.update(
                { status: 'available', payout_id: null },
                { where: { payout_id: id } }
            );
            
            await payout.update({
                status: 'Rejected',
                processed_date: new Date(),
                processed_by: admin_id,
                rejection_reason
            });
            return sendSuccess(res, 200, 'Payout rejected');
        }

        return sendError(res, 400, 'Invalid action. Use: approve, complete, or reject');
    } catch (error) {
        next(error);
    }
};

// Admin: Update delivery settings
exports.updateDeliverySettings = async (req, res, next) => {
    try {
        const { settings } = req.body;

        if (!settings || !Array.isArray(settings)) {
            return sendError(res, 400, 'Settings array is required');
        }

        for (const setting of settings) {
            await DeliverySettings.update(
                { setting_value: setting.value },
                { where: { setting_key: setting.key } }
            );
        }

        const updatedSettings = await DeliverySettings.getAllSettings();
        return sendSuccess(res, 200, 'Delivery settings updated', updatedSettings);
    } catch (error) {
        next(error);
    }
};

// Admin: Get delivery settings
exports.getDeliverySettings = async (req, res, next) => {
    try {
        const settings = await DeliverySettings.findAll({
            where: { is_active: true },
            order: [['setting_key', 'ASC']]
        });
        return sendSuccess(res, 200, 'Delivery settings retrieved', settings);
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
