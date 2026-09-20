/**
 * Qercha Seller-Create + Moderation + Fractional Shares Test Script
 *
 * Verifies:
 *  - createSellerProductWithQercha (qerchaController.js) creates a Pending product and a
 *    QerchaPackage with moderation_status='pending'.
 *  - A pending package does NOT show up in the public getPackages() listing.
 *  - approvePackage() flips moderation_status to 'approved', and it then appears in getPackages().
 *  - QerchaPackage.total_shares supports fractional values (e.g. 0.5) and persists as a
 *    decimal, not rounded to an integer.
 *  - A participant can join a package purchasing a fractional number of shares (0.25) via
 *    joinPackage() using the 'screenshot' payment method (no external gateway call).
 *
 * Run: node tests/qercha-moderation-shares.test.js
 */

const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const { QerchaPackage, QerchaParticipant, Product, User, Order } = require('../models');
const {
    createSellerProductWithQercha,
    approvePackage,
    getPackages,
    joinPackage
} = require('../controllers/qerchaController');

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
    seller: null,
    admin: null,
    buyer: null,
    subCatId: null,
    sellerProduct: null,
    sellerPackage: null,
    fractionalProduct: null,
    fractionalPackage: null,
    order: null,
    participant: null
};

async function resolveSubCategory() {
    let subCatId = '00000000-0000-0000-0000-000000000001';
    try {
        const [subCat] = await sequelize.query(
            'SELECT sub_cat_id FROM product_subcategories LIMIT 1',
            { type: QueryTypes.SELECT }
        );
        if (subCat) subCatId = subCat.sub_cat_id;
    } catch (e) { /* ignore, use default */ }
    return subCatId;
}

async function setup() {
    log.test('Creating Test Users');
    const stamp = Date.now();

    testData.seller = await User.create({
        email: `qercha_seller_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Qercha', last_name: 'Seller',
        phone: `+2519120${stamp % 100000}`,
        role: 'Seller', status: 'Active', kyc_status: true
    });

    testData.admin = await User.create({
        email: `qercha_admin_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Qercha', last_name: 'Admin',
        phone: `+2519121${stamp % 100000}`,
        role: 'Admin', status: 'Active', kyc_status: true
    });

    testData.buyer = await User.create({
        email: `qercha_buyer_${stamp}@test.com`,
        password_hash: 'test_password',
        first_name: 'Qercha', last_name: 'Buyer',
        phone: `+2519122${stamp % 100000}`,
        role: 'Buyer', status: 'Active', kyc_status: true
    });

    testData.subCatId = await resolveSubCategory();
    log.step(`Using sub_cat_id: ${testData.subCatId}`);
    log.success('Setup complete');
}

async function testSellerCreateIsPendingAndHidden() {
    log.test('TEST 1: Seller-created package is pending and hidden from public listing');
    try {
        const stamp = Date.now();
        const req = {
            body: {
                name: `Qercha Test Animal ${stamp}`,
                description: 'Test animal for qercha moderation test',
                sub_cat_id: testData.subCatId,
                price: 10000,
                currency: 'ETB',
                stock_quantity: 1,
                create_qercha: 'true',
                total_shares: '4'
            },
            files: undefined,
            user: { user_id: testData.seller.user_id, role: 'Seller' }
        };
        const res = new MockResponse();
        await createSellerProductWithQercha(req, res, (err) => { if (err) throw err; });

        if (res.statusCode !== 201 || !res.data.success) {
            throw new Error(`Expected 201 success, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        testData.sellerProduct = await Product.findByPk(res.data.data.product_id);
        testData.sellerPackage = await QerchaPackage.findByPk(res.data.data.qercha_package.package_id);

        if (!testData.sellerPackage) {
            throw new Error('QerchaPackage was not created');
        }
        if (testData.sellerPackage.moderation_status !== 'pending') {
            throw new Error(`Expected moderation_status='pending', got '${testData.sellerPackage.moderation_status}'`);
        }
        // Also must not auto-approve the product itself (should require admin approval)
        if (testData.sellerProduct.status !== 'Pending') {
            throw new Error(`Expected product status='Pending', got '${testData.sellerProduct.status}'`);
        }

        log.step(`Product ${testData.sellerProduct.product_id} status=${testData.sellerProduct.status}`);
        log.step(`Package ${testData.sellerPackage.package_id} moderation_status=${testData.sellerPackage.moderation_status}`);

        // Confirm it does NOT appear in public getPackages()
        // (getPackages also requires Product.status = 'Live', which is doubly true here since it's Pending)
        const listReq = { query: {} };
        const listRes = new MockResponse();
        await getPackages(listReq, listRes, (err) => { if (err) throw err; });

        const found = (listRes.data.data.packages || []).find(p => p.package_id === testData.sellerPackage.package_id);
        if (found) {
            throw new Error('Pending package unexpectedly appeared in public getPackages() listing');
        }
        log.step('Pending package correctly absent from public listing');

        log.success('Seller-created package is pending and hidden from buyers');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testApprovalMakesItVisible() {
    log.test('TEST 2: Approving the package flips status and makes it visible');
    try {
        // First move the underlying product to Live so it satisfies getPackages()'s product filter
        // (moderation approval only concerns the QerchaPackage; approving product listing is a
        // separate admin action in this codebase's product moderation flow).
        await testData.sellerProduct.update({ status: 'Live' });

        const req = {
            params: { id: testData.sellerPackage.package_id },
            user: { user_id: testData.admin.user_id, role: 'Admin' }
        };
        const res = new MockResponse();
        await approvePackage(req, res, (err) => { if (err) throw err; });

        if (res.statusCode !== 200 || !res.data.success) {
            throw new Error(`Expected 200 success, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        await testData.sellerPackage.reload();
        if (testData.sellerPackage.moderation_status !== 'approved') {
            throw new Error(`Expected moderation_status='approved', got '${testData.sellerPackage.moderation_status}'`);
        }
        log.step(`Package moderation_status=${testData.sellerPackage.moderation_status}`);

        const listReq = { query: {} };
        const listRes = new MockResponse();
        await getPackages(listReq, listRes, (err) => { if (err) throw err; });

        const found = (listRes.data.data.packages || []).find(p => p.package_id === testData.sellerPackage.package_id);
        if (!found) {
            throw new Error('Approved package did not appear in public getPackages() listing');
        }
        log.step('Approved package now appears in public listing');

        log.success('Approval flow works end-to-end');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testFractionalTotalShares() {
    log.test('TEST 3: Fractional total_shares (0.5) persists as decimal, not rounded');
    try {
        const stamp = Date.now();

        testData.fractionalProduct = await Product.create({
            name: `Fractional Qercha Product ${stamp}`,
            description: 'Test product for fractional shares',
            price: 1000,
            currency: 'ETB',
            seller_id: testData.seller.user_id,
            status: 'Live',
            stock_quantity: 1,
            availability_status: 'available',
            sub_cat_id: testData.subCatId
        });

        // Created directly at model level (bypassing the >=2-share business rule enforced by the
        // create/update controllers) to verify the DB column itself supports fractional values
        // as documented on the model (DECIMAL(4,2), comment: "supports fractional shares e.g. 0.25, 0.5").
        testData.fractionalPackage = await QerchaPackage.create({
            ox_product_id: testData.fractionalProduct.product_id,
            total_shares: 0.5,
            shares_available: 0.5,
            host_user_id: testData.seller.user_id,
            status: 'Active',
            moderation_status: 'approved',
            admin_approved_by: testData.admin.user_id,
            approved_at: new Date()
        });

        await testData.fractionalPackage.reload();
        const persistedTotal = parseFloat(testData.fractionalPackage.total_shares);
        if (persistedTotal !== 0.5) {
            throw new Error(`Expected total_shares=0.5, got ${testData.fractionalPackage.total_shares} (parsed ${persistedTotal})`);
        }
        log.step(`total_shares persisted as ${testData.fractionalPackage.total_shares} (not rounded to integer)`);

        // Update path too
        await testData.fractionalPackage.update({ total_shares: 0.25, shares_available: 0.25 });
        await testData.fractionalPackage.reload();
        const updatedTotal = parseFloat(testData.fractionalPackage.total_shares);
        if (updatedTotal !== 0.25) {
            throw new Error(`Expected updated total_shares=0.25, got ${testData.fractionalPackage.total_shares}`);
        }
        log.step(`total_shares updated and persisted as ${testData.fractionalPackage.total_shares}`);

        // Restore to 0.5/0.5 for the join test below
        await testData.fractionalPackage.update({ total_shares: 0.5, shares_available: 0.5 });

        log.success('Fractional total_shares persists correctly as a decimal');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testParticipantPurchasesFractionalShares() {
    log.test('TEST 4: Participant purchases 0.25 shares via joinPackage (screenshot payment)');
    try {
        const req = {
            params: { id: testData.fractionalPackage.package_id },
            body: {
                shares_purchased: '0.25',
                payment_method: 'screenshot',
                shipping_address: 'Test address',
                shipping_full_name: 'Qercha Buyer',
                shipping_phone: '+251900000000',
                shipping_city: 'Addis Ababa',
                shipping_region: 'Addis Ababa'
            },
            user: { user_id: testData.buyer.user_id }
        };
        const res = new MockResponse();
        await joinPackage(req, res, (err) => { if (err) throw err; });

        if (res.statusCode !== 201 || !res.data.success) {
            throw new Error(`Expected 201 success, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        const sharesPurchased = parseFloat(res.data.data.shares_purchased);
        if (sharesPurchased !== 0.25) {
            throw new Error(`Expected shares_purchased=0.25, got ${res.data.data.shares_purchased}`);
        }

        testData.participant = await QerchaParticipant.findByPk(res.data.data.participant_id);
        testData.order = await Order.findByPk(res.data.data.order_id);

        if (!testData.participant) {
            throw new Error('QerchaParticipant row was not created');
        }
        if (parseFloat(testData.participant.shares_purchased) !== 0.25) {
            throw new Error(`Persisted shares_purchased mismatch: ${testData.participant.shares_purchased}`);
        }

        await testData.fractionalPackage.reload();
        const remaining = parseFloat(testData.fractionalPackage.shares_available);
        if (remaining !== 0.25) {
            throw new Error(`Expected shares_available=0.25 after purchase, got ${testData.fractionalPackage.shares_available}`);
        }

        log.step(`Participant purchased ${testData.participant.shares_purchased} shares; package shares_available now ${testData.fractionalPackage.shares_available}`);
        log.success('Fractional share purchase (0.25) works correctly');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function cleanup() {
    log.test('Cleaning up test data');
    try {
        if (testData.participant) {
            await QerchaParticipant.destroy({ where: { participant_id: testData.participant.participant_id } });
        }
        if (testData.order) {
            await Order.destroy({ where: { order_id: testData.order.order_id } });
        }
        if (testData.fractionalPackage) {
            await QerchaPackage.destroy({ where: { package_id: testData.fractionalPackage.package_id } });
        }
        if (testData.sellerPackage) {
            await QerchaPackage.destroy({ where: { package_id: testData.sellerPackage.package_id } });
        }
        if (testData.fractionalProduct) {
            await testData.fractionalProduct.destroy();
        }
        if (testData.sellerProduct) {
            await testData.sellerProduct.destroy();
        }
        if (testData.seller) await testData.seller.destroy();
        if (testData.admin) await testData.admin.destroy();
        if (testData.buyer) await testData.buyer.destroy();

        log.success('Test data cleaned up');
    } catch (e) {
        log.error(`Cleanup failed: ${e.message}`);
    }
}

async function runTests() {
    console.log('\n========================================');
    console.log('Qercha Moderation + Fractional Shares Test Suite');
    console.log('========================================\n');

    const results = {
        sellerCreateIsPendingAndHidden: false,
        approvalMakesItVisible: false,
        fractionalTotalShares: false,
        participantPurchasesFractionalShares: false
    };

    try {
        await sequelize.authenticate();
        log.info('Database connected');

        await setup();

        results.sellerCreateIsPendingAndHidden = await testSellerCreateIsPendingAndHidden();

        if (results.sellerCreateIsPendingAndHidden) {
            results.approvalMakesItVisible = await testApprovalMakesItVisible();
        }

        results.fractionalTotalShares = await testFractionalTotalShares();

        if (results.fractionalTotalShares) {
            results.participantPurchasesFractionalShares = await testParticipantPurchasesFractionalShares();
        }
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
