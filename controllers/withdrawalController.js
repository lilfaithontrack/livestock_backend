const { SellerPayout, SellerEarnings, SellerBankAccount, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Request withdrawal (Seller)
exports.requestWithdrawal = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { amount, bank_account_id, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        // Get available balance
        const availableBalance = await SellerEarnings.sum('net_amount', {
            where: { 
                seller_id, 
                status: 'available' 
            }
        }) || 0;

        if (amount > availableBalance) {
            return res.status(400).json({ 
                error: `Insufficient balance. Available: ETB ${availableBalance}` 
            });
        }

        // Get bank account details
        let bankAccount;
        if (bank_account_id) {
            bankAccount = await SellerBankAccount.findOne({
                where: { account_id: bank_account_id, seller_id }
            });
        } else {
            // Get primary bank account
            bankAccount = await SellerBankAccount.findOne({
                where: { seller_id, is_primary: true }
            });
        }

        if (!bankAccount) {
            return res.status(400).json({ 
                error: 'Please add a bank account before requesting withdrawal' 
            });
        }

        // Check for pending withdrawals
        const pendingWithdrawal = await SellerPayout.findOne({
            where: { 
                seller_id, 
                status: { [Op.in]: ['Pending', 'Approved', 'Processing'] }
            }
        });

        if (pendingWithdrawal) {
            return res.status(400).json({ 
                error: 'You have a pending withdrawal request. Please wait for it to be processed.' 
            });
        }

        // Create withdrawal request
        const payout = await SellerPayout.create({
            seller_id,
            amount,
            bank_name: bankAccount.bank_name,
            account_name: bankAccount.account_name,
            account_number: bankAccount.account_number,
            status: 'Pending',
            request_date: new Date(),
            notes
        });

        res.status(201).json({
            message: 'Withdrawal request submitted successfully',
            payout
        });
    } catch (error) {
        console.error('Error requesting withdrawal:', error);
        res.status(500).json({ error: 'Failed to submit withdrawal request' });
    }
};

// Get seller's withdrawals
exports.getMyWithdrawals = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { status, limit = 20, offset = 0 } = req.query;

        const whereClause = { seller_id };
        if (status) {
            whereClause.status = status;
        }

        const { count, rows: withdrawals } = await SellerPayout.findAndCountAll({
            where: whereClause,
            order: [['request_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: User,
                    as: 'processor',
                    attributes: ['user_id', 'email', 'phone']
                }
            ]
        });

        res.json({ 
            withdrawals,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
};

// Get withdrawal by ID
exports.getWithdrawalById = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const withdrawal = await SellerPayout.findOne({
            where: { payout_id: id, seller_id },
            include: [
                {
                    model: User,
                    as: 'processor',
                    attributes: ['user_id', 'email', 'phone']
                },
                {
                    model: SellerEarnings,
                    as: 'earnings'
                }
            ]
        });

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        res.json({ withdrawal });
    } catch (error) {
        console.error('Error fetching withdrawal:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawal' });
    }
};

// Admin: Get all withdrawals
exports.getAllWithdrawals = async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }

        const { count, rows: withdrawals } = await SellerPayout.findAndCountAll({
            where: whereClause,
            order: [['request_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone', 'address']
                },
                {
                    model: User,
                    as: 'processor',
                    attributes: ['user_id', 'email', 'phone']
                }
            ]
        });

        res.json({ 
            withdrawals,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching all withdrawals:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
};

// Admin: Get pending withdrawals
exports.getPendingWithdrawals = async (req, res) => {
    try {
        const withdrawals = await SellerPayout.findAll({
            where: { status: 'Pending' },
            order: [['request_date', 'ASC']],
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone', 'address']
                }
            ]
        });

        // Get available balance for each seller
        const withdrawalsWithBalance = await Promise.all(
            withdrawals.map(async (w) => {
                const availableBalance = await SellerEarnings.sum('net_amount', {
                    where: { seller_id: w.seller_id, status: 'available' }
                }) || 0;

                return {
                    ...w.toJSON(),
                    available_balance: availableBalance,
                    has_sufficient_balance: availableBalance >= w.amount
                };
            })
        );

        res.json({ withdrawals: withdrawalsWithBalance });
    } catch (error) {
        console.error('Error fetching pending withdrawals:', error);
        res.status(500).json({ error: 'Failed to fetch pending withdrawals' });
    }
};

// Admin: Approve withdrawal
exports.approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;

        const withdrawal = await SellerPayout.findByPk(id);

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ error: 'Withdrawal is not pending' });
        }

        // Verify available balance
        const availableBalance = await SellerEarnings.sum('net_amount', {
            where: { seller_id: withdrawal.seller_id, status: 'available' }
        }) || 0;

        if (withdrawal.amount > availableBalance) {
            return res.status(400).json({ 
                error: `Insufficient seller balance. Available: ETB ${availableBalance}` 
            });
        }

        await withdrawal.update({
            status: 'Approved',
            processed_by: admin_id
        });

        res.json({
            message: 'Withdrawal approved successfully',
            withdrawal
        });
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
};

// Admin: Mark as processing
exports.processWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;

        const withdrawal = await SellerPayout.findByPk(id);

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'Approved') {
            return res.status(400).json({ error: 'Withdrawal must be approved first' });
        }

        await withdrawal.update({
            status: 'Processing',
            processed_by: admin_id
        });

        res.json({
            message: 'Withdrawal marked as processing',
            withdrawal
        });
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({ error: 'Failed to process withdrawal' });
    }
};

// Admin: Complete withdrawal with proof
exports.completeWithdrawal = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { payment_proof_url, transaction_reference, notes } = req.body;
        const admin_id = req.user.user_id;

        const withdrawal = await SellerPayout.findByPk(id);

        if (!withdrawal) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        if (!['Approved', 'Processing'].includes(withdrawal.status)) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Withdrawal must be approved or processing' });
        }

        // Mark earnings as withdrawn
        let remainingAmount = parseFloat(withdrawal.amount);
        const earningsToUpdate = await SellerEarnings.findAll({
            where: { 
                seller_id: withdrawal.seller_id, 
                status: 'available' 
            },
            order: [['available_date', 'ASC']],
            transaction
        });

        for (const earning of earningsToUpdate) {
            if (remainingAmount <= 0) break;

            const earningAmount = parseFloat(earning.net_amount);
            
            if (earningAmount <= remainingAmount) {
                await earning.update({
                    status: 'withdrawn',
                    payout_id: withdrawal.payout_id
                }, { transaction });
                remainingAmount -= earningAmount;
            }
        }

        // Update withdrawal
        await withdrawal.update({
            status: 'Completed',
            processed_date: new Date(),
            processed_by: admin_id,
            payment_proof_url,
            transaction_reference,
            notes: notes || withdrawal.notes
        }, { transaction });

        await transaction.commit();

        res.json({
            message: 'Withdrawal completed successfully',
            withdrawal
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error completing withdrawal:', error);
        res.status(500).json({ error: 'Failed to complete withdrawal' });
    }
};

// Admin: Reject withdrawal
exports.rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;
        const admin_id = req.user.user_id;

        if (!rejection_reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const withdrawal = await SellerPayout.findByPk(id);

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        if (!['Pending', 'Approved'].includes(withdrawal.status)) {
            return res.status(400).json({ error: 'Cannot reject this withdrawal' });
        }

        await withdrawal.update({
            status: 'Rejected',
            processed_date: new Date(),
            processed_by: admin_id,
            rejection_reason
        });

        res.json({
            message: 'Withdrawal rejected',
            withdrawal
        });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
};

// Get withdrawal stats (Admin)
exports.getWithdrawalStats = async (req, res) => {
    try {
        const totalPending = await SellerPayout.count({ where: { status: 'Pending' } });
        const totalApproved = await SellerPayout.count({ where: { status: 'Approved' } });
        const totalProcessing = await SellerPayout.count({ where: { status: 'Processing' } });
        const totalCompleted = await SellerPayout.count({ where: { status: 'Completed' } });
        const totalRejected = await SellerPayout.count({ where: { status: 'Rejected' } });

        const pendingAmount = await SellerPayout.sum('amount', { 
            where: { status: { [Op.in]: ['Pending', 'Approved', 'Processing'] } }
        }) || 0;

        const completedAmount = await SellerPayout.sum('amount', { 
            where: { status: 'Completed' }
        }) || 0;

        res.json({
            pending_count: totalPending,
            approved_count: totalApproved,
            processing_count: totalProcessing,
            completed_count: totalCompleted,
            rejected_count: totalRejected,
            pending_amount: pendingAmount,
            completed_amount: completedAmount
        });
    } catch (error) {
        console.error('Error fetching withdrawal stats:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawal statistics' });
    }
};
