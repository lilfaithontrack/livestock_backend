/**
 * Delivery Agent Rating Test Script
 *
 * Verifies POST /api/v1/deliveries/:id/rate (deliveryController.rateDelivery):
 *  - A buyer can rate a Delivered delivery (1-5), which updates Delivery.delivery_rating
 *    and rolls into User.agent_rating / agent_rating_count (running average).
 *  - Rejects rating a non-Delivered delivery.
 *  - Rejects rating someone else's delivery.
 *  - Rejects double-rating the same delivery.
 *
 * Run: node tests/delivery-rating.test.js
 */

const sequelize = require('../config/database');
const { Delivery, Order, User } = require('../models');
const { rateDelivery } = require('../controllers/deliveryController');

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

const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`\x1b[32m[PASS] ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m[FAIL] ${msg}\x1b[0m`),
    test: (name) => console.log(`\n[TEST] ${name}`),
    step: (msg) => console.log(`  → ${msg}`)
};

let testData = {
    buyer: null,
    otherBuyer: null,
    seller: null,
    agent: null,
    order1: null,
    order2: null,
    delivery1: null,
    delivery2: null
};

async function callRate(deliveryId, userId, body) {
    const req = { params: { id: deliveryId }, body, user: { user_id: userId } };
    const res = new MockResponse();
    await rateDelivery(req, res, (err) => { if (err) throw err; });
    return res;
}

async function setup() {
    log.test('Creating Test Users, Order, Delivery');

    const stamp = Date.now();

    testData.buyer = await User.create({
        email: `rate_buyer_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test', last_name: 'Buyer',
        phone: `+2519110${stamp % 100000}`,
        role: 'Buyer', status: 'Active', kyc_status: 'Verified'
    });

    testData.otherBuyer = await User.create({
        email: `rate_other_buyer_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Other', last_name: 'Buyer',
        phone: `+2519111${stamp % 100000}`,
        role: 'Buyer', status: 'Active', kyc_status: 'Verified'
    });

    testData.seller = await User.create({
        email: `rate_seller_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test', last_name: 'Seller',
        phone: `+2519112${stamp % 100000}`,
        role: 'Seller', status: 'Active', kyc_status: 'Verified'
    });

    testData.agent = await User.create({
        email: `rate_agent_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Test', last_name: 'Agent',
        phone: `+2519113${stamp % 100000}`,
        role: 'Agent', status: 'Active', kyc_status: 'Verified',
        agent_rating: 5.00,
        agent_rating_count: 0
    });

    testData.order1 = await Order.create({
        buyer_id: testData.buyer.user_id,
        seller_id: testData.seller.user_id,
        total_amount: 1000,
        payment_status: 'Paid',
        order_status: 'Delivered',
        order_type: 'regular'
    });

    testData.order2 = await Order.create({
        buyer_id: testData.buyer.user_id,
        seller_id: testData.seller.user_id,
        total_amount: 2000,
        payment_status: 'Paid',
        order_status: 'Placed',
        order_type: 'regular'
    });

    testData.delivery1 = await Delivery.create({
        order_id: testData.order1.order_id,
        agent_id: testData.agent.user_id,
        status: 'Delivered'
    });

    testData.delivery2 = await Delivery.create({
        order_id: testData.order2.order_id,
        agent_id: testData.agent.user_id,
        status: 'Assigned'
    });

    log.success('Setup complete');
}

async function testSuccessfulRating() {
    log.test('TEST 1: Buyer rates a Delivered delivery (first rating)');
    try {
        const res = await callRate(testData.delivery1.delivery_id, testData.buyer.user_id, { rating: 4, feedback: 'Good' });

        if (res.statusCode !== 200 || !res.data.success) {
            throw new Error(`Expected success 200, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        const delivery = await Delivery.findByPk(testData.delivery1.delivery_id);
        if (delivery.delivery_rating !== 4) {
            throw new Error(`Expected delivery_rating=4, got ${delivery.delivery_rating}`);
        }

        const agent = await User.findByPk(testData.agent.user_id);
        if (agent.agent_rating_count !== 1) {
            throw new Error(`Expected agent_rating_count=1, got ${agent.agent_rating_count}`);
        }
        if (parseFloat(agent.agent_rating) !== 4.00) {
            throw new Error(`Expected agent_rating=4.00 (first rating), got ${agent.agent_rating}`);
        }

        log.step(`delivery_rating=4, agent_rating=${agent.agent_rating}, agent_rating_count=${agent.agent_rating_count}`);
        log.success('First rating recorded correctly');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testAverageAcrossTwoRatings() {
    log.test('TEST 2: Average across 2 ratings for the same agent');
    try {
        // Second delivery for the same agent, rated by otherBuyer
        const order3 = await Order.create({
            buyer_id: testData.otherBuyer.user_id,
            seller_id: testData.seller.user_id,
            total_amount: 500,
            payment_status: 'Paid',
            order_status: 'Delivered',
            order_type: 'regular'
        });
        const delivery3 = await Delivery.create({
            order_id: order3.order_id,
            agent_id: testData.agent.user_id,
            status: 'Delivered'
        });
        testData.order3 = order3;
        testData.delivery3 = delivery3;

        // Agent currently has 1 rating of 4 (from TEST 1). Rate this one 2 -> avg should be 3.00
        const res = await callRate(delivery3.delivery_id, testData.otherBuyer.user_id, { rating: 2 });
        if (res.statusCode !== 200) {
            throw new Error(`Expected 200, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        const agent = await User.findByPk(testData.agent.user_id);
        if (agent.agent_rating_count !== 2) {
            throw new Error(`Expected agent_rating_count=2, got ${agent.agent_rating_count}`);
        }
        const expectedAvg = (4 + 2) / 2;
        if (parseFloat(agent.agent_rating) !== expectedAvg) {
            throw new Error(`Expected agent_rating=${expectedAvg}, got ${agent.agent_rating}`);
        }

        log.step(`agent_rating=${agent.agent_rating} (expected ${expectedAvg}), agent_rating_count=${agent.agent_rating_count}`);
        log.success('Average across 2 ratings computed correctly');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testRejectsNonDelivered() {
    log.test('TEST 3: Rejects rating a non-Delivered delivery');
    try {
        const res = await callRate(testData.delivery2.delivery_id, testData.buyer.user_id, { rating: 5 });
        if (res.statusCode === 200) {
            throw new Error('Expected rejection, but rating succeeded');
        }
        const delivery = await Delivery.findByPk(testData.delivery2.delivery_id);
        if (delivery.delivery_rating !== null) {
            throw new Error('delivery_rating should remain null for non-Delivered delivery');
        }
        log.step(`Rejected with status ${res.statusCode}: ${res.data.message}`);
        log.success('Non-Delivered delivery correctly rejected');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testRejectsOtherUsersDelivery() {
    log.test('TEST 4: Rejects rating someone else\'s delivery');
    try {
        // otherBuyer tries to rate delivery1, which belongs to buyer's order
        const res = await callRate(testData.delivery1.delivery_id, testData.otherBuyer.user_id, { rating: 1 });
        if (res.statusCode === 200) {
            throw new Error('Expected rejection, but rating succeeded');
        }
        log.step(`Rejected with status ${res.statusCode}: ${res.data.message}`);
        log.success('Cross-user rating correctly rejected');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testRejectsDoubleRating() {
    log.test('TEST 5: Rejects double-rating the same delivery');
    try {
        // delivery1 was already rated 4 by buyer in TEST 1
        const res = await callRate(testData.delivery1.delivery_id, testData.buyer.user_id, { rating: 5 });
        if (res.statusCode === 200) {
            throw new Error('Expected rejection, but second rating succeeded');
        }
        const delivery = await Delivery.findByPk(testData.delivery1.delivery_id);
        if (delivery.delivery_rating !== 4) {
            throw new Error(`delivery_rating should remain 4, got ${delivery.delivery_rating}`);
        }
        log.step(`Rejected with status ${res.statusCode}: ${res.data.message}`);
        log.success('Double-rating correctly rejected');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function cleanup() {
    log.test('Cleaning up test data');
    try {
        const deliveryIds = [testData.delivery1, testData.delivery2, testData.delivery3]
            .filter(Boolean).map(d => d.delivery_id);
        if (deliveryIds.length) {
            await Delivery.destroy({ where: { delivery_id: deliveryIds } });
        }

        const orderIds = [testData.order1, testData.order2, testData.order3]
            .filter(Boolean).map(o => o.order_id);
        if (orderIds.length) {
            await Order.destroy({ where: { order_id: orderIds } });
        }

        if (testData.buyer) await testData.buyer.destroy();
        if (testData.otherBuyer) await testData.otherBuyer.destroy();
        if (testData.seller) await testData.seller.destroy();
        if (testData.agent) await testData.agent.destroy();

        log.success('Test data cleaned up');
    } catch (e) {
        log.error(`Cleanup failed: ${e.message}`);
    }
}

async function runTests() {
    console.log('\n========================================');
    console.log('Delivery Agent Rating Test Suite');
    console.log('========================================\n');

    const results = {
        successfulRating: false,
        averageAcrossTwoRatings: false,
        rejectsNonDelivered: false,
        rejectsOtherUsersDelivery: false,
        rejectsDoubleRating: false
    };

    try {
        await sequelize.authenticate();
        log.info('Database connected');

        await setup();

        results.successfulRating = await testSuccessfulRating();
        results.averageAcrossTwoRatings = await testAverageAcrossTwoRatings();
        results.rejectsNonDelivered = await testRejectsNonDelivered();
        results.rejectsOtherUsersDelivery = await testRejectsOtherUsersDelivery();
        results.rejectsDoubleRating = await testRejectsDoubleRating();
    } catch (error) {
        log.error(`Test suite error: ${error.message}`);
        console.error(error);
    } finally {
        await cleanup();
        await sequelize.close();
    }

    console.log('\n========================================');
    console.log('Test Results Summary');
    console.log('========================================');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;

    for (const [name, passed] of Object.entries(results)) {
        console.log(`${name}: ${passed ? 'PASS' : 'FAIL'}`);
    }

    console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('\nAll tests passed.');
        process.exit(0);
    } else {
        console.log('\nSome tests failed. Please review the output above.');
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };
