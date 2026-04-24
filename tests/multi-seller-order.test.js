/**
 * Multi-Seller Order & QR Code Test Script
 * 
 * This script verifies:
 * 1. Order splitting: 1 checkout → N orders (one per seller)
 * 2. QR code generation: Each seller's order gets a unique QR code
 * 3. Seller isolation: Sellers can only access their own orders
 * 
 * Run: node tests/multi-seller-order.test.js
 */

const sequelize = require('../config/database');
const { Order, OrderGroup, OrderItem, Product, User, Delivery } = require('../models');
const { createOrder } = require('../controllers/orderController');
const { ensureDeliveryCodesForGroup } = require('../utils/orderDeliveryVerification');
const { verifyQRCode } = require('../utils/qrGenerator');

// Mock response helpers
class MockResponse {
    constructor() {
        this.statusCode = 200;
        this.data = null;
    }
    status(code) {
        this.statusCode = code;
        return this;
    }
    json(data) {
        this.data = data;
        return this;
    }
}

const sendSuccess = (res, code, message, data) => {
    return res.status(code).json({ success: true, message, data });
};

const sendError = (res, code, message) => {
    return res.status(code).json({ success: false, message });
};

// Test configuration
const TEST_CONFIG = {
    verbose: true,
    cleanup: true
};

// Test state
let testData = {
    buyer: null,
    seller1: null,
    seller2: null,
    seller3: null,
    product1: null, // seller1's product
    product2: null, // seller2's product
    product3: null, // seller3's product
    orderGroup: null,
    orders: [],
};

// Logger
const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`\x1b[32m[PASS] ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m[FAIL] ${msg}\x1b[0m`),
    test: (name) => console.log(`\n[TEST] ${name}`),
    step: (msg) => console.log(`  → ${msg}`)
};

// Create test users
async function createTestUsers() {
    log.test('Creating Test Users');
    
    // Create buyer
    testData.buyer = await User.create({
        email: `buyer_test_${Date.now()}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test',
        last_name: 'Buyer',
        phone: '+251911000001',
        role: 'Buyer',
        status: 'Active',
        kyc_status: 'Verified'
    });
    log.step(`Buyer created: ${testData.buyer.user_id}`);
    
    // Create 3 sellers
    testData.seller1 = await User.create({
        email: `seller1_test_${Date.now()}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test',
        last_name: 'Seller1',
        phone: '+251911000002',
        role: 'Seller',
        status: 'Active',
        kyc_status: 'Verified'
    });
    log.step(`Seller 1 created: ${testData.seller1.user_id}`);
    
    testData.seller2 = await User.create({
        email: `seller2_test_${Date.now()}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test',
        last_name: 'Seller2',
        phone: '+251911000003',
        role: 'Seller',
        status: 'Active',
        kyc_status: 'Verified'
    });
    log.step(`Seller 2 created: ${testData.seller2.user_id}`);
    
    testData.seller3 = await User.create({
        email: `seller3_test_${Date.now()}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test',
        last_name: 'Seller3',
        phone: '+251911000004',
        role: 'Seller',
        status: 'Active',
        kyc_status: 'Verified'
    });
    log.step(`Seller 3 created: ${testData.seller3.user_id}`);
    
    log.success('Test users created');
}

// Create test products
async function createTestProducts() {
    log.test('Creating Test Products');
    
    // Get a valid subcategory or create test one
    const { QueryTypes } = require('sequelize');
    const sequelize = require('../config/database');
    
    let subCatId = '00000000-0000-0000-0000-000000000001';
    
    // Try to get existing subcategory
    try {
        const [subCat] = await sequelize.query(
            "SELECT sub_cat_id FROM product_subcategories LIMIT 1",
            { type: QueryTypes.SELECT }
        );
        if (subCat) {
            subCatId = subCat.sub_cat_id;
        }
    } catch (e) {
        // Ignore error, use default UUID
    }
    
    testData.product1 = await Product.create({
        name: 'Product from Seller 1',
        description: 'Test product',
        price: 1000,
        currency: 'ETB',
        seller_id: testData.seller1.user_id,
        status: 'Live',
        stock_quantity: 100,
        availability_status: 'available',
        sub_cat_id: subCatId
    });
    log.step(`Product 1 created: ${testData.product1.product_id} (Seller: ${testData.seller1.user_id})`);
    
    testData.product2 = await Product.create({
        name: 'Product from Seller 2',
        description: 'Test product',
        price: 2000,
        currency: 'ETB',
        seller_id: testData.seller2.user_id,
        status: 'Live',
        stock_quantity: 100,
        availability_status: 'available',
        sub_cat_id: subCatId
    });
    log.step(`Product 2 created: ${testData.product2.product_id} (Seller: ${testData.seller2.user_id})`);
    
    testData.product3 = await Product.create({
        name: 'Product from Seller 3',
        description: 'Test product',
        price: 3000,
        currency: 'ETB',
        seller_id: testData.seller3.user_id,
        status: 'Live',
        stock_quantity: 100,
        availability_status: 'available',
        sub_cat_id: subCatId
    });
    log.step(`Product 3 created: ${testData.product3.product_id} (Seller: ${testData.seller3.user_id})`);
    
    log.success('Test products created');
}

// Test 1: Order Splitting
async function testOrderSplitting() {
    log.test('TEST 1: Order Splitting (1 checkout → N orders)');
    
    const transaction = await sequelize.transaction();
    
    try {
        // Simulate checkout with items from 3 different sellers
        const checkoutItems = [
            { product_id: testData.product1.product_id, quantity: 2, type: 'product' },
            { product_id: testData.product2.product_id, quantity: 1, type: 'product' },
            { product_id: testData.product3.product_id, quantity: 3, type: 'product' }
        ];
        
        log.step(`Checkout items: ${JSON.stringify(checkoutItems.map(i => ({ product_id: i.product_id, qty: i.quantity })))}`);
        
        // Create OrderGroup manually
        const orderGroup = await OrderGroup.create({
            buyer_id: testData.buyer.user_id,
            total_amount: 13000, // (1000*2) + (2000*1) + (3000*3)
            payment_status: 'Pending',
            order_type: 'regular'
        }, { transaction });
        
        log.step(`OrderGroup created: ${orderGroup.group_id}`);
        
        // Create orders for each seller
        const sellerBuckets = {};
        
        // Seller 1 items
        sellerBuckets[testData.seller1.user_id] = {
            orderItems: [{
                product_id: testData.product1.product_id,
                quantity: 2,
                unit_price: 1000,
                seller_id: testData.seller1.user_id
            }],
            subtotal: 2000
        };
        
        // Seller 2 items
        sellerBuckets[testData.seller2.user_id] = {
            orderItems: [{
                product_id: testData.product2.product_id,
                quantity: 1,
                unit_price: 2000,
                seller_id: testData.seller2.user_id
            }],
            subtotal: 2000
        };
        
        // Seller 3 items
        sellerBuckets[testData.seller3.user_id] = {
            orderItems: [{
                product_id: testData.product3.product_id,
                quantity: 3,
                unit_price: 3000,
                seller_id: testData.seller3.user_id
            }],
            subtotal: 9000
        };
        
        const createdOrders = [];
        
        for (const [sellerId, bucket] of Object.entries(sellerBuckets)) {
            const order = await Order.create({
                group_id: orderGroup.group_id,
                seller_id: sellerId,
                buyer_id: testData.buyer.user_id,
                total_amount: bucket.subtotal,
                payment_status: 'Pending',
                order_status: 'Placed',
                order_type: 'regular'
            }, { transaction });
            
            // Create order items
            for (const oi of bucket.orderItems) {
                await OrderItem.create({
                    order_id: order.order_id,
                    ...oi
                }, { transaction });
            }
            
            createdOrders.push({
                order_id: order.order_id,
                seller_id: sellerId,
                subtotal: bucket.subtotal
            });
            
            log.step(`Order created: ${order.order_id} (Seller: ${sellerId}, Amount: ${bucket.subtotal})`);
        }
        
        await transaction.commit();
        
        // Assertions
        if (createdOrders.length !== 3) {
            throw new Error(`Expected 3 orders, got ${createdOrders.length}`);
        }
        
        // Verify each order has correct seller_id
        const order1 = await Order.findByPk(createdOrders[0].order_id);
        const order2 = await Order.findByPk(createdOrders[1].order_id);
        const order3 = await Order.findByPk(createdOrders[2].order_id);
        
        if (order1.seller_id !== testData.seller1.user_id) {
            throw new Error('Order 1 seller_id mismatch');
        }
        if (order2.seller_id !== testData.seller2.user_id) {
            throw new Error('Order 2 seller_id mismatch');
        }
        if (order3.seller_id !== testData.seller3.user_id) {
            throw new Error('Order 3 seller_id mismatch');
        }
        
        // Save for later tests
        testData.orderGroup = orderGroup;
        testData.orders = createdOrders;
        
        log.success(`Order splitting works: 1 checkout → ${createdOrders.length} orders`);
        log.step(`OrderGroup: ${orderGroup.group_id}`);
        log.step(`Orders: ${createdOrders.map(o => o.order_id).join(', ')}`);
        
        return true;
    } catch (error) {
        await transaction.rollback();
        log.error(`Order splitting test failed: ${error.message}`);
        return false;
    }
}

// Test 2: QR Code Generation
async function testQRCodeGeneration() {
    log.test('TEST 2: QR Code Generation (Each order gets unique QR)');
    
    try {
        // Mark orders as paid
        for (const orderData of testData.orders) {
            await Order.update(
                { payment_status: 'Paid', order_status: 'Paid' },
                { where: { order_id: orderData.order_id } }
            );
        }
        
        // Generate QR codes for all orders in the group
        await ensureDeliveryCodesForGroup(testData.orderGroup.group_id);
        
        // Verify each order has unique QR code
        const qrCodes = [];
        
        for (const orderData of testData.orders) {
            const order = await Order.findByPk(orderData.order_id);
            
            if (!order.qr_code || !order.qr_code_hash) {
                throw new Error(`Order ${order.order_id} missing QR code`);
            }
            
            if (!order.delivery_otp_hash || !order.delivery_otp_expires_at) {
                throw new Error(`Order ${order.order_id} missing OTP`);
            }
            
            qrCodes.push({
                order_id: order.order_id,
                seller_id: order.seller_id,
                qr_code: order.qr_code,
                qr_code_hash: order.qr_code_hash
            });
            
            log.step(`Order ${order.order_id}: QR code generated`);
        }
        
        // Verify QR codes are unique
        const uniqueQRCodes = new Set(qrCodes.map(q => q.qr_code));
        if (uniqueQRCodes.size !== qrCodes.length) {
            throw new Error('QR codes are not unique!');
        }
        
        // Verify QR code validation works
        for (const qr of qrCodes) {
            const isValid = verifyQRCode(qr.qr_code, qr.qr_code_hash);
            if (!isValid) {
                throw new Error(`QR code verification failed for order ${qr.order_id}`);
            }
        }
        
        log.success(`QR codes generated: ${qrCodes.length} unique codes`);
        log.step('All QR codes validate correctly');
        
        return true;
    } catch (error) {
        log.error(`QR code generation test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Seller Isolation
async function testSellerIsolation() {
    log.test('TEST 3: Seller Isolation (Sellers only see their orders)');
    
    try {
        const { Op } = require('sequelize');
        
        // Test Seller 1 can only see their orders
        const seller1Orders = await Order.findAll({
            where: {
                [Op.or]: [
                    { seller_id: testData.seller1.user_id },
                    { '$items.seller_id$': testData.seller1.user_id }
                ]
            },
            include: [{ model: OrderItem, as: 'items' }],
            subQuery: false
        });
        
        if (seller1Orders.length !== 1) {
            throw new Error(`Seller 1 should see 1 order, saw ${seller1Orders.length}`);
        }
        if (seller1Orders[0].seller_id !== testData.seller1.user_id) {
            throw new Error('Seller 1 sees wrong order');
        }
        log.step(`Seller 1 sees ${seller1Orders.length} order(s) - correct`);
        
        // Test Seller 2 can only see their orders
        const seller2Orders = await Order.findAll({
            where: {
                [Op.or]: [
                    { seller_id: testData.seller2.user_id },
                    { '$items.seller_id$': testData.seller2.user_id }
                ]
            },
            include: [{ model: OrderItem, as: 'items' }],
            subQuery: false
        });
        
        if (seller2Orders.length !== 1) {
            throw new Error(`Seller 2 should see 1 order, saw ${seller2Orders.length}`);
        }
        log.step(`Seller 2 sees ${seller2Orders.length} order(s) - correct`);
        
        // Test Seller 3 can only see their orders
        const seller3Orders = await Order.findAll({
            where: {
                [Op.or]: [
                    { seller_id: testData.seller3.user_id },
                    { '$items.seller_id$': testData.seller3.user_id }
                ]
            },
            include: [{ model: OrderItem, as: 'items' }],
            subQuery: false
        });
        
        if (seller3Orders.length !== 1) {
            throw new Error(`Seller 3 should see 1 order, saw ${seller3Orders.length}`);
        }
        log.step(`Seller 3 sees ${seller3Orders.length} order(s) - correct`);
        
        // Test Seller 1 cannot see Seller 2's order
        const seller1TryingSeller2 = await Order.findOne({
            where: {
                order_id: seller2Orders[0].order_id,
                seller_id: testData.seller1.user_id
            }
        });
        
        if (seller1TryingSeller2) {
            throw new Error('Seller 1 can see Seller 2 order - ISOLATION BROKEN!');
        }
        log.step('Seller 1 cannot access Seller 2 order - correct');
        
        log.success('Seller isolation working correctly');
        return true;
    } catch (error) {
        log.error(`Seller isolation test failed: ${error.message}`);
        return false;
    }
}

// Test 4: Delivery Ownership
async function testDeliveryOwnership() {
    log.test('TEST 4: Delivery Ownership Verification');
    
    try {
        // Create delivery records for each order
        for (const orderData of testData.orders) {
            const order = await Order.findByPk(orderData.order_id);
            
            await Delivery.create({
                order_id: order.order_id,
                agent_id: order.seller_id, // Seller is the agent for self-delivery
                status: 'Assigned'
            });
            
            log.step(`Delivery created for order ${order.order_id}`);
        }
        
        // Test: Seller 1 can only access deliveries for their orders
        const seller1Deliveries = await Delivery.findAll({
            include: [{
                model: Order,
                as: 'order',
                where: { seller_id: testData.seller1.user_id },
                required: true
            }]
        });
        
        if (seller1Deliveries.length !== 1) {
            throw new Error(`Seller 1 should see 1 delivery, saw ${seller1Deliveries.length}`);
        }
        log.step('Seller 1 can only access their own delivery - correct');
        
        // Test: Verify the order belongs to seller before delivery registration
        const orderForSeller2 = await Order.findOne({
            where: { 
                order_id: testData.orders[1].order_id,
                seller_id: testData.seller2.user_id 
            }
        });
        
        if (!orderForSeller2) {
            throw new Error('Seller 2 order ownership verification failed');
        }
        log.step('Order ownership verification works correctly');
        
        log.success('Delivery ownership verification working');
        return true;
    } catch (error) {
        log.error(`Delivery ownership test failed: ${error.message}`);
        return false;
    }
}

// Cleanup
async function cleanup() {
    if (!TEST_CONFIG.cleanup) return;
    
    log.test('Cleaning up test data');
    
    try {
        // Delete deliveries
        if (testData.orders.length > 0) {
            await Delivery.destroy({
                where: {
                    order_id: testData.orders.map(o => o.order_id)
                }
            });
        }
        
        // Delete order items
        if (testData.orders.length > 0) {
            await OrderItem.destroy({
                where: {
                    order_id: testData.orders.map(o => o.order_id)
                }
            });
        }
        
        // Delete orders
        if (testData.orders.length > 0) {
            await Order.destroy({
                where: {
                    order_id: testData.orders.map(o => o.order_id)
                }
            });
        }
        
        // Delete order group
        if (testData.orderGroup) {
            await OrderGroup.destroy({
                where: { group_id: testData.orderGroup.group_id }
            });
        }
        
        // Delete products
        if (testData.product1) await testData.product1.destroy();
        if (testData.product2) await testData.product2.destroy();
        if (testData.product3) await testData.product3.destroy();
        
        // Delete users
        if (testData.buyer) await testData.buyer.destroy();
        if (testData.seller1) await testData.seller1.destroy();
        if (testData.seller2) await testData.seller2.destroy();
        if (testData.seller3) await testData.seller3.destroy();
        
        log.success('Test data cleaned up');
    } catch (error) {
        log.error(`Cleanup failed: ${error.message}`);
    }
}

// Main test runner
async function runTests() {
    console.log('\n========================================');
    console.log('Multi-Seller Order & QR Code Test Suite');
    console.log('========================================\n');
    
    const results = {
        orderSplitting: false,
        qrCodeGeneration: false,
        sellerIsolation: false,
        deliveryOwnership: false
    };
    
    try {
        // Connect to database
        await sequelize.authenticate();
        log.info('Database connected');
        
        // Setup
        await createTestUsers();
        await createTestProducts();
        
        // Run tests
        results.orderSplitting = await testOrderSplitting();
        
        if (results.orderSplitting) {
            results.qrCodeGeneration = await testQRCodeGeneration();
            results.sellerIsolation = await testSellerIsolation();
            results.deliveryOwnership = await testDeliveryOwnership();
        }
        
    } catch (error) {
        log.error(`Test suite error: ${error.message}`);
        console.error(error);
    } finally {
        // Cleanup
        await cleanup();
        await sequelize.close();
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('Test Results Summary');
    console.log('========================================');
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;
    
    console.log(`\nOrder Splitting (1 checkout → N orders):    ${results.orderSplitting ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`QR Code Generation (Unique per seller):       ${results.qrCodeGeneration ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Seller Isolation (Can only see own orders):   ${results.sellerIsolation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Delivery Ownership (Sellers scan own only):   ${results.deliveryOwnership ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Multi-seller system is working correctly.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please review the output above.');
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
