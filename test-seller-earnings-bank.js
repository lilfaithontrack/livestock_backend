// Test script for Seller Earnings and Bank Accounts API
// Run with: node test-seller-earnings-bank.js
// Make sure to set JWT_TOKEN and BASE_URL environment variables

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your-seller-jwt-token-here';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test data
const testBankAccount = {
  bank_name: 'Commercial Bank of Ethiopia',
  account_name: 'Test Seller Account',
  account_number: '1000200030004000',
  account_type: 'checking',
  is_primary: true
};

let createdBankAccountId = null;

async function runTests() {
  console.log('💰 Starting Seller Earnings & Bank Accounts API Tests...\n');

  try {
    // Test 1: Get seller earnings/wallet
    console.log('1️⃣ Testing GET /seller/earnings (Wallet Summary)');
    const earningsResponse = await api.get('/seller/earnings');
    console.log('✅ Earnings Status:', earningsResponse.status);
    console.log('✅ Earnings Response:', JSON.stringify(earningsResponse.data, null, 2));
    console.log('');

    // Test 2: Get seller bank accounts
    console.log('2️⃣ Testing GET /seller/bank-accounts (List Bank Accounts)');
    const listBankResponse = await api.get('/seller/bank-accounts');
    console.log('✅ List Bank Accounts Status:', listBankResponse.status);
    console.log('✅ Bank Accounts Count:', listBankResponse.data.data?.accounts?.length);
    console.log('✅ Bank Accounts:', JSON.stringify(listBankResponse.data.data?.accounts, null, 2));
    console.log('');

    // Test 3: Add a new bank account
    console.log('3️⃣ Testing POST /seller/bank-accounts (Add Bank Account)');
    const addBankResponse = await api.post('/seller/bank-accounts', testBankAccount);
    console.log('✅ Add Bank Account Status:', addBankResponse.status);
    console.log('✅ Add Bank Account Response:', JSON.stringify(addBankResponse.data, null, 2));
    createdBankAccountId = addBankResponse.data.data?.account?.account_id;
    console.log('📍 Created Bank Account ID:', createdBankAccountId);
    console.log('');

    // Test 4: Get bank account by ID
    if (createdBankAccountId) {
      console.log('4️⃣ Testing GET /seller/bank-accounts/:id (Get Bank Account)');
      const getBankResponse = await api.get(`/seller/bank-accounts/${createdBankAccountId}`);
      console.log('✅ Get Bank Account Status:', getBankResponse.status);
      console.log('✅ Bank Account Details:', JSON.stringify(getBankResponse.data.data?.account, null, 2));
      console.log('');
    }

    // Test 5: Update bank account
    if (createdBankAccountId) {
      console.log('5️⃣ Testing PUT /seller/bank-accounts/:id (Update Bank Account)');
      const updateBankData = {
        account_name: 'Updated Test Account',
        bank_name: 'Dashen Bank'
      };
      const updateBankResponse = await api.put(`/seller/bank-accounts/${createdBankAccountId}`, updateBankData);
      console.log('✅ Update Bank Account Status:', updateBankResponse.status);
      console.log('✅ Updated Bank Account:', JSON.stringify(updateBankResponse.data.data?.account, null, 2));
      console.log('');
    }

    // Test 6: Set bank account as primary
    if (createdBankAccountId) {
      console.log('6️⃣ Testing PUT /seller/bank-accounts/:id/primary (Set Primary)');
      const primaryResponse = await api.put(`/seller/bank-accounts/${createdBankAccountId}/primary`);
      console.log('✅ Set Primary Status:', primaryResponse.status);
      console.log('✅ Set Primary Response:', JSON.stringify(primaryResponse.data.data, null, 2));
      console.log('');
    }

    // Test 7: Verify bank account
    if (createdBankAccountId) {
      console.log('7️⃣ Testing PUT /seller/bank-accounts/:id/verify (Verify Bank Account)');
      const verifyResponse = await api.put(`/seller/bank-accounts/${createdBankAccountId}/verify`);
      console.log('✅ Verify Bank Account Status:', verifyResponse.status);
      console.log('✅ Verify Response:', JSON.stringify(verifyResponse.data.data?.account, null, 2));
      console.log('');
    }

    // Test 8: Delete bank account
    if (createdBankAccountId) {
      console.log('8️⃣ Testing DELETE /seller/bank-accounts/:id (Delete Bank Account)');
      const deleteBankResponse = await api.delete(`/seller/bank-accounts/${createdBankAccountId}`);
      console.log('✅ Delete Bank Account Status:', deleteBankResponse.status);
      console.log('✅ Delete Response:', JSON.stringify(deleteBankResponse.data, null, 2));
      console.log('');
    }

    // Test 9: Get seller settings
    console.log('9️⃣ Testing GET /seller/settings (Get Seller Settings)');
    const settingsResponse = await api.get('/seller/settings');
    console.log('✅ Seller Settings Status:', settingsResponse.status);
    console.log('✅ Seller Settings:', JSON.stringify(settingsResponse.data.data, null, 2));
    console.log('');

    // Test 10: Update seller settings
    console.log('🔟 Testing PUT /seller/settings (Update Seller Settings)');
    const updateSettingsData = {
      can_self_deliver: true,
      auto_accept_delivery: false,
      notify_new_orders: true,
      preferred_delivery_radius_km: 15
    };
    const updateSettingsResponse = await api.put('/seller/settings', updateSettingsData);
    console.log('✅ Update Settings Status:', updateSettingsResponse.status);
    console.log('✅ Updated Settings:', JSON.stringify(updateSettingsResponse.data.data, null, 2));
    console.log('');

    console.log('🎉 All earnings and bank account tests completed successfully!');

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('❌ HTTP Status:', error.response.status);
    }
    process.exit(1);
  }
}

// Check environment variables
if (!JWT_TOKEN || JWT_TOKEN === 'your-seller-jwt-token-here') {
  console.error('❌ Please set JWT_TOKEN environment variable');
  console.log('Example: JWT_TOKEN=your-actual-jwt-token node test-seller-earnings-bank.js');
  process.exit(1);
}

runTests();
