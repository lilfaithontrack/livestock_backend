const axios = require('axios');

// CONFIGURATION
const API_URL = 'https://api.shegergebeya.com/api/v1';
const EMAIL = 'admin@ethiolivestock.com'; // Replace with valid admin email if different
const PASSWORD = 'admin123';         // Replace with valid admin password

async function testLiveApi() {
    try {
        console.log(`1. Logging in to ${API_URL}...`);
        const loginRes = await axios.post(`${API_URL}/auth/admin/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        console.log('Login Response Data:', JSON.stringify(loginRes.data, null, 2));

        // Try to handle different response structures
        const token = loginRes.data.token || loginRes.data.data?.token;

        if (!token) {
            console.error('❌ Could not extract token from response.');
            process.exit(1);
        }
        console.log('✅ Login Successful.');

        console.log('\n2. Fetching Approved/Paid orders for delivery...');
        const ordersRes = await axios.get(`${API_URL}/deliveries/admin/orders/approved`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const orders = ordersRes.data.data.orders;
        console.log(`✅ Request successful. Found ${orders.length} orders.`);

        const paidOrders = orders.filter(o => o.payment_status === 'Paid');
        console.log(`\n--- Analysis ---`);
        console.log(`Total Orders: ${orders.length}`);
        console.log(`Paid Orders: ${paidOrders.length}`);

        if (paidOrders.length > 0) {
            console.log('✅ SUCCESS: Live API is returning Paid orders.');
            paidOrders.forEach(o => {
                console.log(`- Order ${o.order_id}: Status=${o.order_status}, Payment=${o.payment_status}`);
            });
        } else {
            console.log('⚠️ WARNING: No Paid orders found in the response.');
            console.log('Possible reasons:');
            console.log('1. There are no orders with payment_status="Paid" in the Live DB.');
            console.log('2. The Live Backend CODE has not been updated to fetch Paid orders.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testLiveApi();
