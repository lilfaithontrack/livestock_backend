const axios = require('axios');

// CONFIGURATION
const API_URL = 'https://api.shegergebeya.com/api/v1';
const ADMIN_EMAIL = 'admin@ethiolivestock.com'; // Replace with valid admin email
const ADMIN_PASSWORD = 'admin123';         // Replace with valid admin password

const TARGET_AGENT_EMAIL = 'kaleb@delivery.com';
const NEW_PASSWORD = 'password123';

async function resetAgentPassword() {
    try {
        console.log(`1. Logging in as Admin (${ADMIN_EMAIL})...`);
        const loginRes = await axios.post(`${API_URL}/auth/admin/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        const token = loginRes.data.token || loginRes.data.data?.token;
        if (!token) {
            console.error('❌ Could not extract token from response.');
            process.exit(1);
        }
        console.log('✅ Admin Login Successful.');

        console.log(`\n2. Finding agent: ${TARGET_AGENT_EMAIL}...`);
        const agentsRes = await axios.get(`${API_URL}/agents`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Handle different response structures (data.agents or data.users)
        const agents = agentsRes.data.data?.agents || agentsRes.data.agents || agentsRes.data.users || [];

        const agent = agents.find(a => a.email === TARGET_AGENT_EMAIL);

        if (!agent) {
            console.error(`❌ Agent not found with email: ${TARGET_AGENT_EMAIL}`);
            console.log('Available agents:', agents.map(a => a.email).join(', '));
            process.exit(1);
        }

        console.log(`✅ Found Agent: ${agent.email} (ID: ${agent.user_id})`);

        console.log(`\n3. Updating password to: "${NEW_PASSWORD}"...`);
        const updateRes = await axios.put(`${API_URL}/agents/${agent.user_id}`, {
            password: NEW_PASSWORD
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (updateRes.data.success) {
            console.log('\n✅✅ PASSWORD RESET SUCCESSFUL! ✅✅');
            console.log(`Agent: ${TARGET_AGENT_EMAIL}`);
            console.log(`New Password: ${NEW_PASSWORD}`);
        } else {
            console.error('❌ Update failed:', updateRes.data);
        }

    } catch (error) {
        console.error('\n❌ ERROR:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

resetAgentPassword();
