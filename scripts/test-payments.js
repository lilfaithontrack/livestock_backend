require('dotenv').config({ path: 'backend/.env' });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

let authToken = '';

async function loginAndGetToken() {
    console.log('\n--- Fetching an existing user to generate a token locally ---');
    try {
        const user = await User.findOne({
            attributes: ['user_id', 'role']
        });

        if (!user) {
            console.error('❌ No users found in the database. Please create one first.');
            return false;
        }

        const secret = process.env.JWT_SECRET || 'your_jwt_secret';
        const payload = {
            user_id: user.user_id,
            role: user.role
        };
        authToken = jwt.sign(payload, secret, { expiresIn: '1h' });
        console.log(`✅ Token generated successfully for user ID: ${user.user_id} (${user.role})`);
        return true;
    } catch (error) {
        console.error('❌ Failed to generate token using DB:');
        console.error(error.message);
        return false;
    }
}

async function testChapaPayment() {
    console.log('\n--- Testing Chapa Payment Initialization ---');
    try {
        const payload = {
            payment_method: 'chapa',
            amount: 150.50,
            email: 'chapa.test@example.com',
            first_name: 'Abebe',
            last_name: 'Kebede'
        };

        console.log('Sending payload:', payload);
        const response = await axios.post(`${API_BASE_URL}/payments/initialize`, payload, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Chapa Integration Success!');
        console.log('Response Details:');
        console.log(`- Payment ID: ${response.data.data.payment_id}`);
        console.log(`- Transaction Ref: ${response.data.data.tx_ref}`);
        console.log(`- Checkout URL: ${response.data.data.checkout_url}`);

        return true;
    } catch (error) {
        console.error('❌ Chapa Integration Failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        return false;
    }
}

async function testTelebirrPayment() {
    console.log('\n--- Testing Telebirr Payment Initialization ---');
    try {
        const payload = {
            payment_method: 'telebirr',
            amount: 200.00,
            phone_number: '+251911234567'
        };

        console.log('Sending payload:', payload);
        const response = await axios.post(`${API_BASE_URL}/payments/initialize`, payload, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Telebirr Integration Success!');
        console.log('Response Details:');
        console.log(`- Payment ID: ${response.data.data.payment_id}`);
        console.log(`- Transaction Ref: ${response.data.data.tx_ref}`);
        console.log(`- Checkout URL: ${response.data.data.checkout_url}`);

        return true;
    } catch (error) {
        console.error('❌ Telebirr Integration Failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        return false;
    }
}

async function runTests() {
    console.log('========================================');
    console.log('🚀 Starting Payment Integration Tests 🚀');
    console.log(`Target API: ${API_BASE_URL}`);
    console.log('========================================');

    const loggedIn = await loginAndGetToken();
    if (!loggedIn) {
        console.log('Cannot proceed without authentication.');
        process.exit(1);
    }

    // Run tests sequentially
    const chapaSuccess = await testChapaPayment();
    const telebirrSuccess = await testTelebirrPayment();

    console.log('\n========================================');
    console.log('📊 Test Summary 📊');
    console.log(`Chapa:    ${chapaSuccess ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Telebirr: ${telebirrSuccess ? '✅ Passed' : '❌ Failed'}`);
    console.log('========================================');

    if (!chapaSuccess && !telebirrSuccess) process.exit(1);
}

runTests();
