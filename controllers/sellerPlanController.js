const { SellerPlan, User, Product } = require('../models');
const { Op } = require('sequelize');

// Commission settings (can be updated by admin)
let COMMISSION_SETTINGS = {
    default_rate: 15.00,
    min_rate: 5.00,
    max_rate: 30.00,
    description: 'Commission deducted from each sale'
};

// Predefined subscription tiers
const SUBSCRIPTION_TIERS = {
    basic: {
        name: 'Basic',
        subscription_fee: 300,
        max_products: 25,
        description: 'Perfect for small sellers'
    },
    gold: {
        name: 'Gold',
        subscription_fee: 500,
        max_products: 50,
        description: 'Best for growing businesses'
    },
    premium: {
        name: 'Premium',
        subscription_fee: 1000,
        max_products: 150,
        description: 'Unlimited growth potential'
    }
};

exports.createSellerPlan = async (req, res) => {
    try {
        const { 
            plan_type,
            plan_name,
            commission_rate, 
            subscription_fee, 
            max_products,
            subscription_duration_months = 1,
            payment_reference,
            payment_proof_url,
            auto_renew = false
        } = req.body;

        const seller_id = req.user.user_id;

        if (plan_type !== 'commission' && plan_type !== 'subscription') {
            return res.status(400).json({ 
                error: 'Invalid plan type. Must be either "commission" or "subscription"' 
            });
        }

        if (plan_type === 'commission' && !commission_rate) {
            return res.status(400).json({ 
                error: 'Commission rate is required for commission-based plans' 
            });
        }

        if (plan_type === 'subscription' && (!subscription_fee || !max_products)) {
            return res.status(400).json({ 
                error: 'Subscription fee and max products are required for subscription plans' 
            });
        }

        const existingActivePlan = await SellerPlan.findOne({
            where: { 
                seller_id, 
                is_active: true,
                payment_status: { [Op.in]: ['pending', 'paid'] }
            }
        });

        if (existingActivePlan) {
            return res.status(400).json({ 
                error: 'You already have an active plan. Please deactivate it first or wait for it to expire.' 
            });
        }

        const planData = {
            seller_id,
            plan_type,
            plan_name: plan_name || null,
            is_active: false,
            payment_status: 'pending',
            auto_renew
        };

        if (plan_type === 'commission') {
            planData.commission_rate = commission_rate;
        } else {
            planData.subscription_fee = subscription_fee;
            planData.max_products = max_products;
            
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + subscription_duration_months);
            
            planData.subscription_start_date = startDate;
            planData.subscription_end_date = endDate;
        }

        if (payment_reference) {
            planData.payment_reference = payment_reference;
        }

        if (payment_proof_url) {
            planData.payment_proof_url = payment_proof_url;
        }

        const newPlan = await SellerPlan.create(planData);

        res.status(201).json({
            message: 'Seller plan created successfully. Awaiting admin approval.',
            plan: newPlan
        });

    } catch (error) {
        console.error('Error creating seller plan:', error);
        res.status(500).json({ error: 'Failed to create seller plan' });
    }
};

exports.getSellerPlans = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const plans = await SellerPlan.findAll({
            where: { seller_id },
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'approver',
                    attributes: ['user_id', 'email', 'phone']
                }
            ]
        });

        res.json({ plans });

    } catch (error) {
        console.error('Error fetching seller plans:', error);
        res.status(500).json({ error: 'Failed to fetch seller plans' });
    }
};

exports.getCurrentPlan = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const currentPlan = await SellerPlan.findOne({
            where: { 
                seller_id, 
                is_active: true,
                payment_status: 'paid'
            },
            include: [
                {
                    model: User,
                    as: 'approver',
                    attributes: ['user_id', 'email', 'phone']
                }
            ]
        });

        if (!currentPlan) {
            return res.status(404).json({ 
                message: 'No active plan found. Please select a plan to start uploading products.' 
            });
        }

        let productCount = 0;
        if (currentPlan.plan_type === 'subscription') {
            productCount = await Product.count({
                where: { 
                    seller_id,
                    status: { [Op.in]: ['Pending', 'Live'] }
                }
            });
        }

        res.json({ 
            plan: currentPlan,
            product_count: productCount,
            can_add_products: currentPlan.plan_type === 'commission' || 
                             (currentPlan.plan_type === 'subscription' && productCount < currentPlan.max_products)
        });

    } catch (error) {
        console.error('Error fetching current plan:', error);
        res.status(500).json({ error: 'Failed to fetch current plan' });
    }
};

exports.updatePlanPayment = async (req, res) => {
    try {
        const { plan_id } = req.params;
        const { payment_reference, payment_proof_url } = req.body;
        const seller_id = req.user.user_id;

        const plan = await SellerPlan.findOne({
            where: { plan_id, seller_id }
        });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.payment_status === 'paid') {
            return res.status(400).json({ error: 'Plan is already paid' });
        }

        await plan.update({
            payment_reference,
            payment_proof_url,
            payment_status: 'pending'
        });

        res.json({
            message: 'Payment information updated. Awaiting admin verification.',
            plan
        });

    } catch (error) {
        console.error('Error updating plan payment:', error);
        res.status(500).json({ error: 'Failed to update payment information' });
    }
};

exports.getAllPlans = async (req, res) => {
    try {
        const { status, plan_type, payment_status } = req.query;
        
        const whereClause = {};
        
        if (status) {
            whereClause.is_active = status === 'active';
        }
        
        if (plan_type) {
            whereClause.plan_type = plan_type;
        }
        
        if (payment_status) {
            whereClause.payment_status = payment_status;
        }

        const plans = await SellerPlan.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone', 'role']
                },
                {
                    model: User,
                    as: 'approver',
                    attributes: ['user_id', 'email', 'phone']
                }
            ]
        });

        res.json({ plans });

    } catch (error) {
        console.error('Error fetching all plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
};

exports.approvePlan = async (req, res) => {
    try {
        const { plan_id } = req.params;
        const admin_id = req.user.user_id;

        const plan = await SellerPlan.findByPk(plan_id, {
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone', 'current_plan_id']
                }
            ]
        });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.payment_status === 'paid' && plan.is_active) {
            return res.status(400).json({ error: 'Plan is already approved and active' });
        }

        await SellerPlan.update(
            { is_active: false },
            { 
                where: { 
                    seller_id: plan.seller_id,
                    plan_id: { [Op.ne]: plan_id }
                }
            }
        );

        await plan.update({
            payment_status: 'paid',
            is_active: true,
            approved_by: admin_id,
            approved_at: new Date()
        });

        await User.update(
            { 
                current_plan_id: plan_id,
                plan_selected_at: new Date()
            },
            { where: { user_id: plan.seller_id } }
        );

        res.json({
            message: 'Plan approved successfully',
            plan
        });

    } catch (error) {
        console.error('Error approving plan:', error);
        res.status(500).json({ error: 'Failed to approve plan' });
    }
};

exports.rejectPlan = async (req, res) => {
    try {
        const { plan_id } = req.params;
        const { notes } = req.body;

        const plan = await SellerPlan.findByPk(plan_id);

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        await plan.update({
            payment_status: 'failed',
            is_active: false,
            notes: notes || 'Payment verification failed'
        });

        res.json({
            message: 'Plan rejected',
            plan
        });

    } catch (error) {
        console.error('Error rejecting plan:', error);
        res.status(500).json({ error: 'Failed to reject plan' });
    }
};

exports.deactivatePlan = async (req, res) => {
    try {
        const { plan_id } = req.params;
        const seller_id = req.user.user_id;

        const plan = await SellerPlan.findOne({
            where: { plan_id, seller_id }
        });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        await plan.update({ is_active: false });

        await User.update(
            { current_plan_id: null },
            { where: { user_id: seller_id, current_plan_id: plan_id } }
        );

        res.json({
            message: 'Plan deactivated successfully',
            plan
        });

    } catch (error) {
        console.error('Error deactivating plan:', error);
        res.status(500).json({ error: 'Failed to deactivate plan' });
    }
};

exports.checkPlanEligibility = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const currentPlan = await SellerPlan.findOne({
            where: { 
                seller_id, 
                is_active: true,
                payment_status: 'paid'
            }
        });

        if (!currentPlan) {
            return res.json({
                eligible: false,
                message: 'No active plan. Please select a plan to upload products.',
                requires_plan_selection: true
            });
        }

        if (currentPlan.plan_type === 'commission') {
            return res.json({
                eligible: true,
                plan_type: 'commission',
                commission_rate: currentPlan.commission_rate,
                message: 'You can upload unlimited products with commission per sale'
            });
        }

        if (currentPlan.plan_type === 'subscription') {
            const now = new Date();
            if (now > new Date(currentPlan.subscription_end_date)) {
                await currentPlan.update({ 
                    is_active: false,
                    payment_status: 'expired'
                });
                
                return res.json({
                    eligible: false,
                    message: 'Your subscription has expired. Please renew to continue.',
                    requires_plan_selection: true
                });
            }

            const productCount = await Product.count({
                where: { 
                    seller_id,
                    status: { [Op.in]: ['Pending', 'Live'] }
                }
            });

            if (productCount >= currentPlan.max_products) {
                return res.json({
                    eligible: false,
                    plan_type: 'subscription',
                    message: `You have reached your product limit (${currentPlan.max_products}). Please upgrade your plan.`,
                    current_products: productCount,
                    max_products: currentPlan.max_products
                });
            }

            return res.json({
                eligible: true,
                plan_type: 'subscription',
                message: 'You can upload more products',
                current_products: productCount,
                max_products: currentPlan.max_products,
                remaining_products: currentPlan.max_products - productCount,
                subscription_end_date: currentPlan.subscription_end_date
            });
        }

    } catch (error) {
        console.error('Error checking plan eligibility:', error);
        res.status(500).json({ error: 'Failed to check plan eligibility' });
    }
};

exports.getPlanStats = async (req, res) => {
    try {
        const totalPlans = await SellerPlan.count();
        const activePlans = await SellerPlan.count({ where: { is_active: true } });
        const commissionPlans = await SellerPlan.count({ where: { plan_type: 'commission', is_active: true } });
        const subscriptionPlans = await SellerPlan.count({ where: { plan_type: 'subscription', is_active: true } });
        const pendingApproval = await SellerPlan.count({ where: { payment_status: 'pending' } });

        res.json({
            total_plans: totalPlans,
            active_plans: activePlans,
            commission_plans: commissionPlans,
            subscription_plans: subscriptionPlans,
            pending_approval: pendingApproval
        });

    } catch (error) {
        console.error('Error fetching plan stats:', error);
        res.status(500).json({ error: 'Failed to fetch plan statistics' });
    }
};

exports.adminCreatePlan = async (req, res) => {
    try {
        const { 
            seller_id,
            plan_type,
            plan_name,
            commission_rate, 
            subscription_fee, 
            max_products,
            subscription_duration_months = 1,
            auto_renew = false,
            notes
        } = req.body;

        if (!seller_id) {
            return res.status(400).json({ error: 'Seller ID is required' });
        }

        if (plan_type !== 'commission' && plan_type !== 'subscription') {
            return res.status(400).json({ 
                error: 'Invalid plan type. Must be either "commission" or "subscription"' 
            });
        }

        if (plan_type === 'commission' && !commission_rate) {
            return res.status(400).json({ 
                error: 'Commission rate is required for commission-based plans' 
            });
        }

        if (plan_type === 'subscription' && (!subscription_fee || !max_products)) {
            return res.status(400).json({ 
                error: 'Subscription fee and max products are required for subscription plans' 
            });
        }

        const seller = await User.findByPk(seller_id);
        if (!seller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        if (seller.role !== 'Seller') {
            return res.status(400).json({ error: 'User must have Seller role' });
        }

        await SellerPlan.update(
            { is_active: false },
            { where: { seller_id, is_active: true } }
        );

        const planData = {
            seller_id,
            plan_type,
            plan_name: plan_name || null,
            is_active: true,
            payment_status: 'paid',
            auto_renew,
            approved_by: req.user.user_id,
            approved_at: new Date(),
            notes
        };

        if (plan_type === 'commission') {
            planData.commission_rate = commission_rate;
        } else {
            planData.subscription_fee = subscription_fee;
            planData.max_products = max_products;
            
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + subscription_duration_months);
            
            planData.subscription_start_date = startDate;
            planData.subscription_end_date = endDate;
        }

        const newPlan = await SellerPlan.create(planData);

        await User.update(
            { 
                current_plan_id: newPlan.plan_id,
                plan_selected_at: new Date()
            },
            { where: { user_id: seller_id } }
        );

        res.status(201).json({
            message: 'Seller plan created and activated successfully',
            plan: newPlan
        });

    } catch (error) {
        console.error('Error creating seller plan:', error);
        res.status(500).json({ error: 'Failed to create seller plan' });
    }
};

exports.adminUpdatePlan = async (req, res) => {
    try {
        const { plan_id } = req.params;
        const { 
            commission_rate, 
            subscription_fee, 
            max_products,
            subscription_duration_months,
            auto_renew,
            notes
        } = req.body;

        const plan = await SellerPlan.findByPk(plan_id);

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const updateData = {};

        if (plan.plan_type === 'commission') {
            if (commission_rate !== undefined) {
                updateData.commission_rate = commission_rate;
            }
        } else if (plan.plan_type === 'subscription') {
            if (subscription_fee !== undefined) {
                updateData.subscription_fee = subscription_fee;
            }
            if (max_products !== undefined) {
                updateData.max_products = max_products;
            }
            if (subscription_duration_months !== undefined && plan.subscription_start_date) {
                const startDate = new Date(plan.subscription_start_date);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + subscription_duration_months);
                updateData.subscription_end_date = endDate;
            }
        }

        if (auto_renew !== undefined) {
            updateData.auto_renew = auto_renew;
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        await plan.update(updateData);

        res.json({
            message: 'Plan updated successfully',
            plan
        });

    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
};

exports.adminDeletePlan = async (req, res) => {
    try {
        const { plan_id } = req.params;

        const plan = await SellerPlan.findByPk(plan_id);

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        await User.update(
            { current_plan_id: null },
            { where: { current_plan_id: plan_id } }
        );

        await plan.destroy();

        res.json({
            message: 'Plan deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
};

exports.getPlanById = async (req, res) => {
    try {
        const { plan_id } = req.params;

        const plan = await SellerPlan.findByPk(plan_id, {
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['user_id', 'email', 'phone', 'role']
                },
                {
                    model: User,
                    as: 'approver',
                    attributes: ['user_id', 'email', 'phone']
                }
            ]
        });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json({ plan });

    } catch (error) {
        console.error('Error fetching plan:', error);
        res.status(500).json({ error: 'Failed to fetch plan' });
    }
};

exports.getSubscriptionTiers = async (req, res) => {
    try {
        res.json({ 
            tiers: SUBSCRIPTION_TIERS,
            message: 'Available subscription tiers'
        });
    } catch (error) {
        console.error('Error fetching subscription tiers:', error);
        res.status(500).json({ error: 'Failed to fetch subscription tiers' });
    }
};

exports.updateSubscriptionTier = async (req, res) => {
    try {
        const { tierKey } = req.params;
        const { subscription_fee, max_products, description } = req.body;

        if (!['basic', 'gold', 'premium'].includes(tierKey)) {
            return res.status(400).json({ error: 'Invalid tier key. Must be basic, gold, or premium' });
        }

        if (!SUBSCRIPTION_TIERS[tierKey]) {
            return res.status(404).json({ error: 'Tier not found' });
        }

        if (subscription_fee !== undefined) {
            if (subscription_fee < 0) {
                return res.status(400).json({ error: 'Subscription fee must be positive' });
            }
            SUBSCRIPTION_TIERS[tierKey].subscription_fee = subscription_fee;
        }

        if (max_products !== undefined) {
            if (max_products < 1) {
                return res.status(400).json({ error: 'Max products must be at least 1' });
            }
            SUBSCRIPTION_TIERS[tierKey].max_products = max_products;
        }

        if (description !== undefined) {
            SUBSCRIPTION_TIERS[tierKey].description = description;
        }

        res.json({
            message: `${SUBSCRIPTION_TIERS[tierKey].name} tier updated successfully`,
            tier: SUBSCRIPTION_TIERS[tierKey]
        });

    } catch (error) {
        console.error('Error updating subscription tier:', error);
        res.status(500).json({ error: 'Failed to update subscription tier' });
    }
};

exports.getCommissionSettings = async (req, res) => {
    try {
        res.json({ 
            commission: COMMISSION_SETTINGS,
            message: 'Commission settings for commission-based plans'
        });
    } catch (error) {
        console.error('Error fetching commission settings:', error);
        res.status(500).json({ error: 'Failed to fetch commission settings' });
    }
};

exports.updateCommissionSettings = async (req, res) => {
    try {
        const { default_rate, min_rate, max_rate, description } = req.body;

        if (default_rate !== undefined) {
            if (default_rate < 0 || default_rate > 100) {
                return res.status(400).json({ error: 'Default rate must be between 0 and 100' });
            }
            COMMISSION_SETTINGS.default_rate = parseFloat(default_rate);
        }

        if (min_rate !== undefined) {
            if (min_rate < 0 || min_rate > 100) {
                return res.status(400).json({ error: 'Min rate must be between 0 and 100' });
            }
            COMMISSION_SETTINGS.min_rate = parseFloat(min_rate);
        }

        if (max_rate !== undefined) {
            if (max_rate < 0 || max_rate > 100) {
                return res.status(400).json({ error: 'Max rate must be between 0 and 100' });
            }
            COMMISSION_SETTINGS.max_rate = parseFloat(max_rate);
        }

        if (description !== undefined) {
            COMMISSION_SETTINGS.description = description;
        }

        if (COMMISSION_SETTINGS.min_rate > COMMISSION_SETTINGS.max_rate) {
            return res.status(400).json({ error: 'Min rate cannot be greater than max rate' });
        }

        if (COMMISSION_SETTINGS.default_rate < COMMISSION_SETTINGS.min_rate || 
            COMMISSION_SETTINGS.default_rate > COMMISSION_SETTINGS.max_rate) {
            return res.status(400).json({ error: 'Default rate must be between min and max rates' });
        }

        res.json({
            message: 'Commission settings updated successfully',
            commission: COMMISSION_SETTINGS
        });

    } catch (error) {
        console.error('Error updating commission settings:', error);
        res.status(500).json({ error: 'Failed to update commission settings' });
    }
};
