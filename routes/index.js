const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const currencyRoutes = require('./currencyRoutes');
const orderRoutes = require('./orderRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const qerchaRoutes = require('./qerchaRoutes');
const adminRoutes = require('./adminRoutes');
const agentRoutes = require('./agentRoutes');
const advertisementRoutes = require('./advertisementRoutes');
const butcherRoutes = require('./butcherRoutes');
const stockRoutes = require('./stockRoutes');
const sellerPlanRoutes = require('./sellerPlanRoutes');
const paymentRoutes = require('./paymentRoutes');
const productTypeRoutes = require('./productTypeRoutes');
const adminBankAccountRoutes = require('./adminBankAccountRoutes');
const sellerBankAccountRoutes = require('./sellerBankAccountRoutes');
const withdrawalRoutes = require('./withdrawalRoutes');
const earningsRoutes = require('./earningsRoutes');
const paymentAccountRoutes = require('./paymentAccountRoutes');
const agentEarningsRoutes = require('./agentEarningsRoutes');
const rentalRoutes = require('./rentalRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/currencies', currencyRoutes);
router.use('/orders', orderRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/qercha', qerchaRoutes);
router.use('/admin', adminRoutes);
router.use('/agents', agentRoutes);
router.use('/advertisements', advertisementRoutes);
router.use('/butchers', butcherRoutes);
router.use('/', stockRoutes); // Stock routes (has its own seller/admin prefixes)
router.use('/seller-plans', sellerPlanRoutes);
router.use('/payments', paymentRoutes);
router.use('/product-types', productTypeRoutes);
router.use('/admin/bank-accounts', adminBankAccountRoutes);
router.use('/seller/bank-accounts', sellerBankAccountRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/earnings', earningsRoutes);
router.use('/payment-accounts', paymentAccountRoutes);
router.use('/agent-earnings', agentEarningsRoutes);
router.use('/rentals', rentalRoutes);
router.use('/notifications', notificationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
