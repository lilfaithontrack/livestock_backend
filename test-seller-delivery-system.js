/**
 * Comprehensive Test Script for Seller Delivery Management System
 * Tests all CRUD operations for seller settings and delivery management
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// Test credentials - update these with actual test accounts
const TEST_SELLER = {
    email: 'testseller@example.com',
    password: 'password123'
};

let authToken = '';
let testOrderId = '';
let testDeliveryId = '';
let testAgentId = '';

// Helper function to make authenticated requests
const apiRequest = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

// Test 1: Login as seller
async function testLogin() {
    console.log('\n[TEST 1] Login as Seller');
    console.log('='.repeat(50));
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: TEST_SELLER.email,
            password: TEST_SELLER.password
        });
        
        if (response.data.success && response.data.data.token) {
            authToken = response.data.data.token;
            console.log('✓ Login successful');
            console.log(`✓ Token: ${authToken.substring(0, 20)}...`);
            console.log(`✓ User Role: ${response.data.data.user.role}`);
            return true;
        } else {
            console.log('✗ Login failed - no token received');
            return false;
        }
    } catch (error) {
        console.log('✗ Login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test 2: Get Seller Settings (should create default if not exists)
async function testGetSettings() {
    console.log('\n[TEST 2] Get Seller Settings');
    console.log('='.repeat(50));
    
    const result = await apiRequest('GET', '/seller/settings');
    
    if (result.success) {
        console.log('✓ Settings retrieved successfully');
        console.log('Settings:', JSON.stringify(result.data.data, null, 2));
        return true;
    } else {
        console.log('✗ Failed to get settings:', result.error);
        return false;
    }
}

// Test 3: Update Seller Settings
async function testUpdateSettings() {
    console.log('\n[TEST 3] Update Seller Settings');
    console.log('='.repeat(50));
    
    const updates = {
        can_self_deliver: true,
        auto_accept_delivery: false,
        preferred_delivery_radius_km: 15.5,
        notify_new_orders: true,
        notify_delivery_assigned: true,
        notify_delivery_completed: true
    };
    
    const result = await apiRequest('PUT', '/seller/settings', updates);
    
    if (result.success) {
        console.log('✓ Settings updated successfully');
        console.log('Updated settings:', JSON.stringify(result.data.data, null, 2));
        return true;
    } else {
        console.log('✗ Failed to update settings:', result.error);
        return false;
    }
}

// Test 4: Get Available Agents
async function testGetAvailableAgents() {
    console.log('\n[TEST 4] Get Available Agents');
    console.log('='.repeat(50));
    
    const result = await apiRequest('GET', '/seller/delivery/available-agents');
    
    if (result.success) {
        const agents = result.data.data.agents;
        console.log(`✓ Retrieved ${agents.length} available agents`);
        
        if (agents.length > 0) {
            testAgentId = agents[0].user_id;
            console.log('Sample agent:', JSON.stringify(agents[0], null, 2));
        } else {
            console.log('⚠ No agents available for testing');
        }
        return true;
    } else {
        console.log('✗ Failed to get agents:', result.error);
        return false;
    }
}

// Test 5: Add Preferred Agent
async function testAddPreferredAgent() {
    console.log('\n[TEST 5] Add Preferred Agent');
    console.log('='.repeat(50));
    
    if (!testAgentId) {
        console.log('⚠ Skipping - no agent ID available');
        return true;
    }
    
    const result = await apiRequest('POST', '/seller/settings/agents/preferred', {
        agent_id: testAgentId
    });
    
    if (result.success) {
        console.log('✓ Agent added to preferred list');
        console.log('Preferred agents:', result.data.data.preferred_agents);
        return true;
    } else {
        console.log('✗ Failed to add preferred agent:', result.error);
        return false;
    }
}

// Test 6: Register Delivery (Self-Delivery)
async function testRegisterSelfDelivery() {
    console.log('\n[TEST 6] Register Self-Delivery');
    console.log('='.repeat(50));
    
    // First, get a paid order
    const ordersResult = await apiRequest('GET', '/orders?status=Paid');
    
    if (!ordersResult.success || !ordersResult.data.data.orders?.length) {
        console.log('⚠ No paid orders available for testing');
        console.log('⚠ Skipping delivery registration tests');
        return true;
    }
    
    testOrderId = ordersResult.data.data.orders[0].order_id;
    console.log(`Using order: ${testOrderId}`);
    
    const deliveryData = {
        delivery_type: 'self',
        delivery_notes: 'Test self-delivery registration'
    };
    
    const result = await apiRequest('POST', `/seller/orders/${testOrderId}/register-delivery`, deliveryData);
    
    if (result.success) {
        testDeliveryId = result.data.data.delivery_id;
        console.log('✓ Self-delivery registered successfully');
        console.log('Delivery ID:', testDeliveryId);
        console.log('Status:', result.data.data.status);
        if (result.data.data.otp) {
            console.log('OTP:', result.data.data.otp);
        }
        return true;
    } else {
        console.log('✗ Failed to register delivery:', result.error);
        return false;
    }
}

// Test 7: Get Seller Deliveries
async function testGetDeliveries() {
    console.log('\n[TEST 7] Get Seller Deliveries');
    console.log('='.repeat(50));
    
    const result = await apiRequest('GET', '/seller/deliveries');
    
    if (result.success) {
        const deliveries = result.data.data.deliveries;
        console.log(`✓ Retrieved ${deliveries.length} deliveries`);
        
        if (deliveries.length > 0) {
            console.log('Latest delivery:', JSON.stringify(deliveries[0], null, 2));
        }
        return true;
    } else {
        console.log('✗ Failed to get deliveries:', result.error);
        return false;
    }
}

// Test 8: Get Delivery Details
async function testGetDeliveryDetails() {
    console.log('\n[TEST 8] Get Delivery Details');
    console.log('='.repeat(50));
    
    if (!testDeliveryId) {
        console.log('⚠ Skipping - no delivery ID available');
        return true;
    }
    
    const result = await apiRequest('GET', `/seller/deliveries/${testDeliveryId}`);
    
    if (result.success) {
        console.log('✓ Delivery details retrieved');
        console.log('Details:', JSON.stringify(result.data.data, null, 2));
        return true;
    } else {
        console.log('✗ Failed to get delivery details:', result.error);
        return false;
    }
}

// Test 9: Update Delivery Assignment
async function testUpdateDeliveryAssignment() {
    console.log('\n[TEST 9] Update Delivery Assignment');
    console.log('='.repeat(50));
    
    if (!testDeliveryId || !testAgentId) {
        console.log('⚠ Skipping - no delivery or agent ID available');
        return true;
    }
    
    const result = await apiRequest('PUT', `/seller/deliveries/${testDeliveryId}/assign`, {
        agent_id: testAgentId
    });
    
    if (result.success) {
        console.log('✓ Delivery reassigned successfully');
        console.log('New agent:', result.data.data.agent_id);
        return true;
    } else {
        console.log('✗ Failed to reassign delivery:', result.error);
        return false;
    }
}

// Test 10: Cancel Delivery
async function testCancelDelivery() {
    console.log('\n[TEST 10] Cancel Delivery');
    console.log('='.repeat(50));
    
    if (!testDeliveryId) {
        console.log('⚠ Skipping - no delivery ID available');
        return true;
    }
    
    const result = await apiRequest('PUT', `/seller/deliveries/${testDeliveryId}/cancel`, {
        reason: 'Test cancellation - automated test'
    });
    
    if (result.success) {
        console.log('✓ Delivery cancelled successfully');
        console.log('Status:', result.data.data.status);
        return true;
    } else {
        console.log('✗ Failed to cancel delivery:', result.error);
        return false;
    }
}

// Test 11: Remove Preferred Agent
async function testRemovePreferredAgent() {
    console.log('\n[TEST 11] Remove Preferred Agent');
    console.log('='.repeat(50));
    
    if (!testAgentId) {
        console.log('⚠ Skipping - no agent ID available');
        return true;
    }
    
    const result = await apiRequest('DELETE', `/seller/settings/agents/preferred/${testAgentId}`);
    
    if (result.success) {
        console.log('✓ Agent removed from preferred list');
        console.log('Preferred agents:', result.data.data.preferred_agents);
        return true;
    } else {
        console.log('✗ Failed to remove preferred agent:', result.error);
        return false;
    }
}

// Test 12: Block Agent
async function testBlockAgent() {
    console.log('\n[TEST 12] Block Agent');
    console.log('='.repeat(50));
    
    if (!testAgentId) {
        console.log('⚠ Skipping - no agent ID available');
        return true;
    }
    
    const result = await apiRequest('POST', '/seller/settings/agents/blocked', {
        agent_id: testAgentId
    });
    
    if (result.success) {
        console.log('✓ Agent blocked successfully');
        console.log('Blocked agents:', result.data.data.blocked_agents);
        return true;
    } else {
        console.log('✗ Failed to block agent:', result.error);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('SELLER DELIVERY MANAGEMENT SYSTEM - COMPREHENSIVE TEST SUITE');
    console.log('═'.repeat(70));
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Test Seller: ${TEST_SELLER.email}`);
    console.log('═'.repeat(70));
    
    const tests = [
        { name: 'Login', fn: testLogin },
        { name: 'Get Settings', fn: testGetSettings },
        { name: 'Update Settings', fn: testUpdateSettings },
        { name: 'Get Available Agents', fn: testGetAvailableAgents },
        { name: 'Add Preferred Agent', fn: testAddPreferredAgent },
        { name: 'Register Self-Delivery', fn: testRegisterSelfDelivery },
        { name: 'Get Deliveries', fn: testGetDeliveries },
        { name: 'Get Delivery Details', fn: testGetDeliveryDetails },
        { name: 'Update Delivery Assignment', fn: testUpdateDeliveryAssignment },
        { name: 'Cancel Delivery', fn: testCancelDelivery },
        { name: 'Remove Preferred Agent', fn: testRemovePreferredAgent },
        { name: 'Block Agent', fn: testBlockAgent }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        skipped: 0
    };
    
    for (const test of tests) {
        try {
            const passed = await test.fn();
            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            console.log(`✗ Test crashed:`, error.message);
            results.failed++;
        }
    }
    
    // Summary
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✓ Passed: ${results.passed}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log(`⚠ Skipped: ${results.skipped}`);
    console.log(`Total: ${tests.length}`);
    console.log('═'.repeat(70));
    
    if (results.failed === 0) {
        console.log('🎉 ALL TESTS PASSED!');
    } else {
        console.log('⚠ SOME TESTS FAILED - Review output above');
    }
    
    process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
