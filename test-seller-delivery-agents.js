// Test script for Seller Delivery Agents API
// Run with: node test-seller-delivery-agents.js
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
const testAgent = {
  full_name: 'Test Delivery Agent',
  phone: '0912345678',
  email: 'testagent@example.com',
  vehicle_type: 'motorcycle',
  vehicle_plate: 'AA-12345'
};

let createdAgentId = null;
let testOrderId = null;

async function runTests() {
  console.log('🚀 Starting Seller Delivery Agents API Tests...\n');

  try {
    // Test 1: Register a new delivery agent
    console.log('1️⃣ Testing POST /seller/delivery-agents (Register Agent)');
    const registerResponse = await api.post('/seller/delivery-agents', testAgent);
    console.log('✅ Register Agent Status:', registerResponse.status);
    console.log('✅ Register Agent Response:', JSON.stringify(registerResponse.data, null, 2));
    createdAgentId = registerResponse.data.data?.agent?.agent_id;
    console.log('📍 Created Agent ID:', createdAgentId);
    console.log('');

    // Test 2: Get all seller's delivery agents
    console.log('2️⃣ Testing GET /seller/delivery-agents (List Agents)');
    const listResponse = await api.get('/seller/delivery-agents');
    console.log('✅ List Agents Status:', listResponse.status);
    console.log('✅ List Agents Count:', listResponse.data.data?.agents?.length);
    console.log('✅ First Agent:', JSON.stringify(listResponse.data.data?.agents?.[0], null, 2));
    console.log('');

    // Test 3: Get single agent details
    if (createdAgentId) {
      console.log('3️⃣ Testing GET /seller/delivery-agents/:id (Agent Details)');
      const detailResponse = await api.get(`/seller/delivery-agents/${createdAgentId}`);
      console.log('✅ Agent Details Status:', detailResponse.status);
      console.log('✅ Agent Details:', JSON.stringify(detailResponse.data.data?.agent, null, 2));
      console.log('');
    }

    // Test 4: Update agent
    if (createdAgentId) {
      console.log('4️⃣ Testing PUT /seller/delivery-agents/:id (Update Agent)');
      const updateData = { full_name: 'Updated Agent Name', vehicle_plate: 'BB-67890' };
      const updateResponse = await api.put(`/seller/delivery-agents/${createdAgentId}`, updateData);
      console.log('✅ Update Agent Status:', updateResponse.status);
      console.log('✅ Updated Agent:', JSON.stringify(updateResponse.data.data?.agent, null, 2));
      console.log('');
    }

    // Test 5: Toggle agent availability
    if (createdAgentId) {
      console.log('5️⃣ Testing PUT /seller/delivery-agents/:id/availability (Toggle Availability)');
      const availResponse = await api.put(`/seller/delivery-agents/${createdAgentId}/availability`, {
        is_available: false
      });
      console.log('✅ Toggle Availability Status:', availResponse.status);
      console.log('✅ Updated Agent:', JSON.stringify(availResponse.data.data?.agent, null, 2));
      console.log('');
    }

    // Test 6: Get agent stats
    if (createdAgentId) {
      console.log('6️⃣ Testing GET /seller/delivery-agents/:id/stats (Agent Stats)');
      const statsResponse = await api.get(`/seller/delivery-agents/${createdAgentId}/stats`);
      console.log('✅ Agent Stats Status:', statsResponse.status);
      console.log('✅ Agent Stats:', JSON.stringify(statsResponse.data.data, null, 2));
      console.log('');
    }

    // Test 7: Get delivery tracking
    console.log('7️⃣ Testing GET /seller/delivery-tracking (Delivery Tracking)');
    const trackingResponse = await api.get('/seller/delivery-tracking');
    console.log('✅ Delivery Tracking Status:', trackingResponse.status);
    console.log('✅ Delivery Tracking Count:', trackingResponse.data.data?.deliveries?.length);
    console.log('');

    // Test 8: Get seller orders (to find an order for assignment test)
    console.log('8️⃣ Testing GET /seller/orders (Get Seller Orders)');
    try {
      const ordersResponse = await api.get('/seller/orders');
      console.log('✅ Seller Orders Status:', ordersResponse.status);
      console.log('✅ Orders Count:', ordersResponse.data.data?.orders?.length);
      
      // Find a paid order for assignment test
      const paidOrder = ordersResponse.data.data?.orders?.find(o => o.payment_status === 'Paid' && o.order_status !== 'Delivered');
      if (paidOrder) {
        testOrderId = paidOrder.order_id;
        console.log('📍 Found Paid Order for Assignment:', testOrderId);
      } else {
        console.log('⚠️ No paid orders found for assignment test');
      }
    } catch (error) {
      console.log('⚠️ Orders endpoint not available or error:', error.message);
    }
    console.log('');

    // Test 9: Assign agent to order (if we have a paid order)
    if (createdAgentId && testOrderId) {
      console.log('9️⃣ Testing POST /seller/orders/:orderId/assign-agent (Assign Agent)');
      try {
        const assignResponse = await api.post(`/seller/orders/${testOrderId}/assign-agent`, {
          agent_id: createdAgentId,
          delivery_notes: 'Test assignment'
        });
        console.log('✅ Assign Agent Status:', assignResponse.status);
        console.log('✅ Assignment Response:', JSON.stringify(assignResponse.data.data, null, 2));
      } catch (error) {
        console.log('⚠️ Assign Agent Error:', error.response?.data || error.message);
      }
    } else {
      console.log('⚠️ Skipping agent assignment test - no paid order available');
    }
    console.log('');

    // Test 10: Deactivate agent
    if (createdAgentId) {
      console.log('🔟 Testing DELETE /seller/delivery-agents/:id (Deactivate Agent)');
      const deactivateResponse = await api.delete(`/seller/delivery-agents/${createdAgentId}`);
      console.log('✅ Deactivate Agent Status:', deactivateResponse.status);
      console.log('✅ Deactivate Response:', JSON.stringify(deactivateResponse.data, null, 2));
      console.log('');
    }

    console.log('🎉 All tests completed successfully!');

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
  console.log('Example: JWT_TOKEN=your-actual-jwt-token node test-seller-delivery-agents.js');
  process.exit(1);
}

runTests();
