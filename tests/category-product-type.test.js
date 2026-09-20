/**
 * Category <-> Product Type Requirement Test Script
 *
 * Verifies:
 *  - createCategory (categoryController.js) rejects a category created WITHOUT product_type_id.
 *  - createCategory succeeds when a valid product_type_id is given, and the row persists
 *    with that FK set.
 *  - getProductTypeCategories (productTypeController.js) returns the newly created category
 *    under its product type.
 *
 * Run: node tests/category-product-type.test.js
 */

const sequelize = require('../config/database');
const { ProductCategory, ProductType } = require('../models');
const { createCategory } = require('../controllers/categoryController');
const { getProductTypeCategories } = require('../controllers/productTypeController');

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
    productType: null,
    categoryWithType: null
};

async function callCreateCategory(body) {
    const req = { body, files: undefined, user: { user_id: 'admin-test', role: 'Admin' } };
    const res = new MockResponse();
    await createCategory(req, res, (err) => { if (err) throw err; });
    return res;
}

async function setup() {
    log.test('Creating a test ProductType');
    const stamp = Date.now();
    testData.productType = await ProductType.create({
        name: `Test Product Type ${stamp}`,
        slug: `test-product-type-${stamp}`,
        description: 'Temporary product type for automated test',
        is_active: true
    });
    log.step(`ProductType created: ${testData.productType.type_id}`);
    log.success('Setup complete');
}

async function testRejectsMissingProductTypeId() {
    log.test('TEST 1: createCategory rejects missing product_type_id');
    try {
        const stamp = Date.now();
        const res = await callCreateCategory({
            name: `No Type Category ${stamp}`
            // product_type_id intentionally omitted
        });

        if (res.statusCode === 201 || (res.data && res.data.success)) {
            // Clean up if it was wrongly created
            if (res.data && res.data.data && res.data.data.category) {
                await ProductCategory.destroy({ where: { cat_id: res.data.data.category.cat_id } });
            }
            throw new Error(`Expected rejection, but category was created (status ${res.statusCode})`);
        }

        if (res.statusCode !== 400) {
            throw new Error(`Expected 400, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        log.step(`Rejected with status ${res.statusCode}: ${res.data.message}`);
        log.success('Missing product_type_id correctly rejected');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testCreatesWithValidProductTypeId() {
    log.test('TEST 2: createCategory succeeds with valid product_type_id and persists FK');
    try {
        const stamp = Date.now();
        const res = await callCreateCategory({
            name: `Typed Category ${stamp}`,
            product_type_id: testData.productType.type_id
        });

        if (res.statusCode !== 201 || !res.data.success) {
            throw new Error(`Expected 201 success, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        const createdId = res.data.data.category.cat_id;
        testData.categoryWithType = await ProductCategory.findByPk(createdId);

        if (!testData.categoryWithType) {
            throw new Error('Category row not found after creation');
        }
        if (testData.categoryWithType.product_type_id !== testData.productType.type_id) {
            throw new Error(`Expected product_type_id=${testData.productType.type_id}, got ${testData.categoryWithType.product_type_id}`);
        }

        log.step(`Category created: ${createdId}, product_type_id=${testData.categoryWithType.product_type_id}`);
        log.success('Category with valid product_type_id created and persisted correctly');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function testGetProductTypeCategoriesReturnsIt() {
    log.test('TEST 3: getProductTypeCategories returns the newly created category');
    try {
        const req = { params: { id: testData.productType.type_id } };
        const res = new MockResponse();
        await getProductTypeCategories(req, res, (err) => { if (err) throw err; });

        if (res.statusCode !== 200 || !res.data.success) {
            throw new Error(`Expected 200 success, got ${res.statusCode}: ${JSON.stringify(res.data)}`);
        }

        const categories = res.data.data.categories || [];
        const found = categories.find(c => c.cat_id === testData.categoryWithType.cat_id);

        if (!found) {
            throw new Error(`Category ${testData.categoryWithType.cat_id} not found in product type's category listing (got ${categories.length} categories)`);
        }

        log.step(`Found category "${found.name}" under product type "${testData.productType.name}"`);
        log.success('getProductTypeCategories returns the new category correctly');
        return true;
    } catch (e) {
        log.error(e.message);
        return false;
    }
}

async function cleanup() {
    log.test('Cleaning up test data');
    try {
        if (testData.categoryWithType) {
            await ProductCategory.destroy({ where: { cat_id: testData.categoryWithType.cat_id } });
        }
        if (testData.productType) {
            await ProductType.destroy({ where: { type_id: testData.productType.type_id } });
        }
        log.success('Test data cleaned up');
    } catch (e) {
        log.error(`Cleanup failed: ${e.message}`);
    }
}

async function runTests() {
    console.log('\n========================================');
    console.log('Category / Product Type Requirement Test Suite');
    console.log('========================================\n');

    const results = {
        rejectsMissingProductTypeId: false,
        createsWithValidProductTypeId: false,
        getProductTypeCategoriesReturnsIt: false
    };

    try {
        await sequelize.authenticate();
        log.info('Database connected');

        await setup();

        results.rejectsMissingProductTypeId = await testRejectsMissingProductTypeId();

        results.createsWithValidProductTypeId = await testCreatesWithValidProductTypeId();

        if (results.createsWithValidProductTypeId) {
            results.getProductTypeCategoriesReturnsIt = await testGetProductTypeCategoriesReturnsIt();
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
