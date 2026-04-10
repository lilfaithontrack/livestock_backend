/**
 * Advanced End-to-End Test Script: Earnings & Wallet Flow
 * 
 * Tests the full flow:
 * 1. Buyer login via email OTP (kalu4mom@gmail.com)
 * 2. Seller login via email/password
 * 3. Admin login via email/password
 * 4. Seller creates a test product
 * 5. Buyer purchases (checkout) the product
 * 6. Admin marks payment as "Paid" → triggers earnings creation
 * 7. Verify seller dashboard shows total_earnings & pending_balance
 * 8. Verify seller wallet shows pending_clearance
 * 9. Cleanup: log results
 * 
 * Usage: node test-earnings-flow.js
 */

const API_BASE = 'https://api.shegergebeya.com/api/v1';
const BUYER_EMAIL = 'kalu4mom@gmail.com';

// ─── Config ──────────────────────────────────────────────
// You'll need to fill these in or the script will prompt
let SELLER_EMAIL = '';
let SELLER_PASSWORD = '';
let ADMIN_EMAIL = '';
let ADMIN_PASSWORD = '';

// ─── Helpers ─────────────────────────────────────────────
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function apiCall(method, path, body = null, token = null) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return { status: res.status, ok: res.ok, data };
}

function log(icon, msg, data) {
    console.log(`\n${icon}  ${msg}`);
    if (data) console.log('   ', JSON.stringify(data, null, 2).split('\n').join('\n    '));
}

function pass(msg) { log('✅', msg); }
function fail(msg, data) { log('❌', msg, data); }
function info(msg, data) { log('ℹ️', msg, data); }
function section(title) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

// ─── Main Test Flow ──────────────────────────────────────
async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   SHEGER GEBEYA - Earnings & Wallet E2E Test Script    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Get credentials interactively
    SELLER_EMAIL = await ask('Seller email: ');
    SELLER_PASSWORD = await ask('Seller password: ');
    ADMIN_EMAIL = await ask('Admin email: ');
    ADMIN_PASSWORD = await ask('Admin password: ');

    let buyerToken, sellerToken, adminToken;
    let sellerId, productId, orderId;
    let subCatId;

    // ══════════════════════════════════════════════════════
    // STEP 1: Buyer Auth (Email OTP)
    // ══════════════════════════════════════════════════════
    section('STEP 1: Buyer Authentication (Email OTP)');

    info('Requesting OTP for buyer...', { email: BUYER_EMAIL });
    const otpReq = await apiCall('POST', '/auth/login/email-otp', { email: BUYER_EMAIL });

    if (!otpReq.ok) {
        fail('Failed to request OTP', otpReq.data);
        rl.close();
        return;
    }

    // Check if OTP was returned in response (dev mode) or ask user
    let otp;
    if (otpReq.data?.data?.otp) {
        otp = otpReq.data.data.otp;
        info(`OTP returned by API (dev mode): ${otp}`);
    } else {
        info('OTP sent to email. Check your inbox.');
        otp = await ask('Enter the OTP from your email: ');
    }

    const verifyRes = await apiCall('POST', '/auth/verify-email-otp', {
        email: BUYER_EMAIL,
        otp: otp,
        name: 'Test Buyer'
    });

    if (!verifyRes.ok) {
        fail('OTP verification failed', verifyRes.data);
        rl.close();
        return;
    }

    buyerToken = verifyRes.data.data.token;
    const buyerUserId = verifyRes.data.data.user.user_id;
    pass(`Buyer authenticated: ${buyerUserId} (role: ${verifyRes.data.data.user.role})`);

    // ══════════════════════════════════════════════════════
    // STEP 2: Seller Auth (Email + Password)
    // ══════════════════════════════════════════════════════
    section('STEP 2: Seller Authentication');

    const sellerLogin = await apiCall('POST', '/auth/login/email', {
        email: SELLER_EMAIL,
        password: SELLER_PASSWORD
    });

    if (!sellerLogin.ok) {
        fail('Seller login failed', sellerLogin.data);
        rl.close();
        return;
    }

    sellerToken = sellerLogin.data.data.token;
    sellerId = sellerLogin.data.data.user.user_id;
    pass(`Seller authenticated: ${sellerId} (role: ${sellerLogin.data.data.user.role})`);

    // ══════════════════════════════════════════════════════
    // STEP 3: Admin Auth
    // ══════════════════════════════════════════════════════
    section('STEP 3: Admin Authentication');

    const adminLogin = await apiCall('POST', '/auth/admin/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });

    if (!adminLogin.ok) {
        fail('Admin login failed', adminLogin.data);
        rl.close();
        return;
    }

    adminToken = adminLogin.data.data.token;
    pass(`Admin authenticated: ${adminLogin.data.data.user.user_id}`);

    // ══════════════════════════════════════════════════════
    // STEP 4: Get a valid subcategory for product creation
    // ══════════════════════════════════════════════════════
    section('STEP 4: Fetching Product Categories');

    const typesRes = await apiCall('GET', '/product-types');
    if (!typesRes.ok) {
        fail('Failed to fetch product types', typesRes.data);
        rl.close();
        return;
    }

    const livestockType = typesRes.data.data.product_types.find(t => t.slug === 'livestock');
    if (!livestockType) {
        fail('Livestock product type not found');
        rl.close();
        return;
    }

    info(`Found livestock type: ${livestockType.type_id}`);

    const catsRes = await apiCall('GET', `/product-types/${livestockType.type_id}/categories`);
    if (!catsRes.ok || !catsRes.data.data.categories.length) {
        fail('No categories found', catsRes.data);
        rl.close();
        return;
    }

    const firstCat = catsRes.data.data.categories[0];
    info(`Using category: ${firstCat.name} (${firstCat.cat_id})`);

    const subsRes = await apiCall('GET', `/categories/${firstCat.cat_id}/subcategories`);
    if (!subsRes.ok || !subsRes.data.data.subcategories.length) {
        fail('No subcategories found', subsRes.data);
        rl.close();
        return;
    }

    subCatId = subsRes.data.data.subcategories[0].sub_cat_id;
    pass(`Using subcategory: ${subsRes.data.data.subcategories[0].name} (${subCatId})`);

    // ══════════════════════════════════════════════════════
    // STEP 5: Check Seller Dashboard BEFORE
    // ══════════════════════════════════════════════════════
    section('STEP 5: Seller Dashboard & Wallet BEFORE Purchase');

    const dashBefore = await apiCall('GET', '/earnings/dashboard', null, sellerToken);
    const walletBefore = await apiCall('GET', '/seller/earnings', null, sellerToken);

    if (dashBefore.ok) {
        info('Seller Dashboard BEFORE:', {
            total_earnings: dashBefore.data.total_earnings,
            pending_balance: dashBefore.data.pending_balance,
            available_balance: dashBefore.data.available_balance,
            withdrawn_amount: dashBefore.data.withdrawn_amount,
        });
    } else {
        info('Dashboard response:', dashBefore.data);
    }

    if (walletBefore.ok) {
        info('Seller Wallet BEFORE:', walletBefore.data.earnings);
    } else {
        info('Wallet response:', walletBefore.data);
    }

    // ══════════════════════════════════════════════════════
    // STEP 6: Seller Creates a Test Product
    // ══════════════════════════════════════════════════════
    section('STEP 6: Creating Test Product');

    // Use FormData-like approach for multipart (product creation expects images)
    // Since we can't easily do multipart with fetch, we'll create without images
    const testProductName = `TEST-EARNINGS-${Date.now()}`;
    const testPrice = 5000;

    // Create product using JSON (the backend might require multipart for images)
    // Let's try with the admin route to create product directly
    const createProductRes = await apiCall('POST', '/admin/products', {
        seller_id: sellerId,
        sub_cat_id: subCatId,
        name: testProductName,
        description: 'Test product for earnings verification - will be deleted',
        price: testPrice,
        location: 'Addis Ababa',
        status: 'Live',
        enable_stock_management: false,
        product_type: 'livestock'
    }, adminToken);

    if (!createProductRes.ok) {
        // Try seller route
        info('Admin product creation failed, trying to find existing Live product...');

        const productsRes = await apiCall('GET', '/products?limit=5');
        if (productsRes.ok && productsRes.data.data.products.length > 0) {
            const liveProduct = productsRes.data.data.products[0];
            productId = liveProduct.product_id;
            info(`Using existing product: ${liveProduct.name} (${productId}), price: ${liveProduct.price}`);
        } else {
            fail('Cannot find any product to test with');
            rl.close();
            return;
        }
    } else {
        productId = createProductRes.data.data?.product?.product_id || createProductRes.data.product?.product_id;
        pass(`Test product created: ${testProductName} (${productId}), price: ${testPrice} ETB`);
    }

    // ══════════════════════════════════════════════════════
    // STEP 7: Buyer Places an Order (Checkout)
    // ══════════════════════════════════════════════════════
    section('STEP 7: Buyer Placing Order');

    const checkoutRes = await apiCall('POST', '/orders/checkout', {
        items: [{
            product_id: productId,
            quantity: 1,
            type: 'product'
        }],
        shipping_address: 'Test Address, Addis Ababa',
        shipping_full_name: 'Test Buyer',
        shipping_phone: '+251900000000',
        shipping_city: 'Addis Ababa',
        shipping_region: 'Addis Ababa'
    }, buyerToken);

    if (!checkoutRes.ok) {
        fail('Checkout failed', checkoutRes.data);
        rl.close();
        return;
    }

    orderId = checkoutRes.data.data.order_id;
    pass(`Order placed: ${orderId}, total: ${checkoutRes.data.data.total_amount} ETB`);

    // ══════════════════════════════════════════════════════
    // STEP 8: Verify order details
    // ══════════════════════════════════════════════════════
    section('STEP 8: Verifying Order Details');

    const orderDetail = await apiCall('GET', `/orders/${orderId}`, null, buyerToken);
    if (orderDetail.ok) {
        const o = orderDetail.data.data.order;
        info('Order details:', {
            order_id: o.order_id,
            total_amount: o.total_amount,
            payment_status: o.payment_status,
            order_status: o.order_status,
            items: o.items?.length || 0
        });

        if (o.items?.length > 0) {
            info('Order item:', {
                product_id: o.items[0].product_id,
                seller_id: o.items[0].seller_id,
                unit_price: o.items[0].unit_price,
                quantity: o.items[0].quantity
            });
        }
    }

    // ══════════════════════════════════════════════════════
    // STEP 9: Admin Marks Payment as Paid (Triggers Earnings)
    // ══════════════════════════════════════════════════════
    section('STEP 9: Admin Approving Payment → Triggers Earnings');

    info('Updating order payment_status to "Paid"...');
    const payRes = await apiCall('PUT', `/orders/${orderId}/status`, {
        payment_status: 'Paid',
        order_status: 'Approved'
    }, adminToken);

    if (!payRes.ok) {
        fail('Failed to update order status', payRes.data);
        rl.close();
        return;
    }

    pass(`Order updated: payment=${payRes.data.data.payment_status}, status=${payRes.data.data.order_status}`);

    // ══════════════════════════════════════════════════════
    // STEP 10: Check Seller Dashboard AFTER
    // ══════════════════════════════════════════════════════
    section('STEP 10: Seller Dashboard & Wallet AFTER Payment');

    // Small delay to let the server process
    await new Promise(r => setTimeout(r, 1500));

    const dashAfter = await apiCall('GET', '/earnings/dashboard', null, sellerToken);
    const walletAfter = await apiCall('GET', '/seller/earnings', null, sellerToken);

    if (dashAfter.ok) {
        info('Seller Dashboard AFTER:', {
            total_earnings: dashAfter.data.total_earnings,
            pending_balance: dashAfter.data.pending_balance,
            available_balance: dashAfter.data.available_balance,
            withdrawn_amount: dashAfter.data.withdrawn_amount,
        });
    } else {
        info('Dashboard response:', dashAfter.data);
    }

    if (walletAfter.ok) {
        info('Seller Wallet AFTER:', walletAfter.data.earnings);
    } else {
        info('Wallet response:', walletAfter.data);
    }

    // ══════════════════════════════════════════════════════
    // STEP 11: Verify Earnings Were Created
    // ══════════════════════════════════════════════════════
    section('STEP 11: Verification Results');

    const earningsHistory = await apiCall('GET', '/earnings/history?limit=5', null, sellerToken);
    if (earningsHistory.ok) {
        const latest = earningsHistory.data.earnings?.[0];
        if (latest) {
            info('Latest earning record:', {
                earning_id: latest.earning_id,
                order_id: latest.order_id,
                order_amount: latest.order_amount,
                commission_rate: latest.commission_rate,
                commission_amount: latest.commission_amount,
                net_amount: latest.net_amount,
                status: latest.status,
                available_date: latest.available_date
            });
        }
    }

    // Compare before/after
    const beforeTotal = parseFloat(dashBefore.data?.total_earnings || walletBefore.data?.earnings?.total_earned || 0);
    const afterTotal = parseFloat(dashAfter.data?.total_earnings || walletAfter.data?.earnings?.total_earned || 0);
    const beforePending = parseFloat(dashBefore.data?.pending_balance || walletBefore.data?.earnings?.pending_clearance || 0);
    const afterPending = parseFloat(dashAfter.data?.pending_balance || walletAfter.data?.earnings?.pending_clearance || 0);

    console.log('\n' + '─'.repeat(60));
    console.log('  COMPARISON');
    console.log('─'.repeat(60));
    console.log(`  Total Earnings:  BEFORE=${beforeTotal}  →  AFTER=${afterTotal}  (diff: +${(afterTotal - beforeTotal).toFixed(2)})`);
    console.log(`  Pending Balance: BEFORE=${beforePending}  →  AFTER=${afterPending}  (diff: +${(afterPending - beforePending).toFixed(2)})`);
    console.log('─'.repeat(60));

    if (afterTotal > beforeTotal) {
        pass('✅ EARNINGS INCREASED — Earnings creation is WORKING!');
    } else {
        fail('❌ EARNINGS DID NOT INCREASE — Check if seller has an active plan');
    }

    if (afterPending > beforePending) {
        pass('✅ PENDING BALANCE INCREASED — Pending tracking is WORKING!');
    } else {
        fail('❌ PENDING BALANCE DID NOT INCREASE — Check createEarning logic');
    }

    // ══════════════════════════════════════════════════════
    // STEP 12: Check Earnings Summary endpoint
    // ══════════════════════════════════════════════════════
    section('STEP 12: Full Earnings Summary');

    const summaryRes = await apiCall('GET', '/earnings/summary', null, sellerToken);
    if (summaryRes.ok) {
        info('Earnings Summary:', summaryRes.data);
    }

    // ══════════════════════════════════════════════════════
    // DONE
    // ══════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(60));
    console.log(`\n  Order ID: ${orderId}`);
    console.log(`  Product ID: ${productId}`);
    console.log(`  Seller ID: ${sellerId}`);
    console.log(`  Buyer ID: ${buyerUserId}`);
    console.log('\n  NOTE: The test order remains in the database.');
    console.log('  Pending earnings will become "available" after 7 days.');
    console.log('  The scheduler runs every hour to transition them.\n');

    rl.close();
}

main().catch(err => {
    console.error('\n💥 Script crashed:', err.message);
    console.error(err.stack);
    rl.close();
    process.exit(1);
});
