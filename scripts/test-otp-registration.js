require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const TEST_PHONE = process.env.TEST_PHONE || '+251951521621';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n[STEP ${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testOTPRegistration() {
    log('\n═══════════════════════════════════════════', 'bright');
    log('  OTP Registration Test Script', 'bright');
    log('═══════════════════════════════════════════', 'bright');
    log(`\nTesting phone: ${TEST_PHONE}`, 'yellow');
    log(`API Base URL: ${API_BASE_URL}\n`, 'yellow');

    let otp = null;
    let token = null;

    try {
        // Step 1: Request OTP
        logStep(1, 'Requesting OTP for phone number...');
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login/phone`, {
                phone: TEST_PHONE
            });

            if (response.data.success) {
                logSuccess('OTP request successful!');
                logInfo(`Message: ${response.data.message}`);
                
                // In development, OTP is returned in response
                if (response.data.data && response.data.data.otp) {
                    otp = response.data.data.otp;
                    logSuccess(`OTP received: ${otp}`);
                    logInfo('(In production, OTP is sent via Telegram bot)');
                } else {
                    logInfo('OTP sent via Telegram bot. Please check your Telegram.');
                    logInfo('If you see this in development, check server logs for OTP.');
                    
                    // Wait a bit for user to check Telegram
                    logInfo('Waiting 5 seconds for you to check Telegram...');
                    await sleep(5000);
                    
                    // In development, we might need to get OTP from console
                    // For testing, let's prompt or use a test OTP
                    logInfo('\nFor testing, you can:');
                    logInfo('1. Check Telegram bot for OTP');
                    logInfo('2. Check server console logs for OTP');
                    logInfo('3. Enter OTP manually when prompted');
                    
                    // In a real test, you'd get this from Telegram or server logs
                    // For now, we'll need to handle this manually
                    return;
                }
            } else {
                logError('OTP request failed!');
                logError(`Error: ${response.data.message || 'Unknown error'}`);
                return;
            }
        } catch (error) {
            if (error.response) {
                logError(`HTTP Error: ${error.response.status}`);
                logError(`Message: ${error.response.data?.message || error.message}`);
                logError(`Details: ${JSON.stringify(error.response.data, null, 2)}`);
            } else {
                logError(`Request failed: ${error.message}`);
            }
            return;
        }

        // Step 2: Verify OTP
        if (!otp) {
            logError('No OTP available. Cannot proceed with verification.');
            return;
        }

        logStep(2, 'Verifying OTP...');
        logInfo(`Using OTP: ${otp}`);
        
        try {
            const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
                phone: TEST_PHONE,
                otp: otp
            });

            if (verifyResponse.data.success) {
                logSuccess('OTP verification successful!');
                logSuccess('User authenticated!');
                
                token = verifyResponse.data.data.token;
                const user = verifyResponse.data.data.user;
                
                logInfo('\nUser Details:');
                logInfo(`  User ID: ${user.user_id}`);
                logInfo(`  Role: ${user.role}`);
                logInfo(`  Phone: ${user.phone}`);
                logInfo(`  Is New User: ${user.is_new_user ? 'Yes' : 'No'}`);
                
                logInfo(`\nJWT Token: ${token.substring(0, 50)}...`);
                
                // Step 3: Test authenticated endpoint (optional)
                logStep(3, 'Testing authenticated endpoint...');
                try {
                    const userResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (userResponse.data.success) {
                        logSuccess('Authenticated endpoint access successful!');
                        logInfo('User profile retrieved successfully.');
                    }
                } catch (authError) {
                    if (authError.response?.status === 404) {
                        logInfo('Profile endpoint not found (this is okay)');
                    } else {
                        logError(`Auth test failed: ${authError.response?.data?.message || authError.message}`);
                    }
                }

                log('\n═══════════════════════════════════════════', 'bright');
                log('  ✓ Registration Test Completed Successfully!', 'green');
                log('═══════════════════════════════════════════', 'bright');
                
            } else {
                logError('OTP verification failed!');
                logError(`Message: ${verifyResponse.data.message || 'Unknown error'}`);
            }
        } catch (verifyError) {
            if (verifyError.response) {
                logError(`HTTP Error: ${verifyError.response.status}`);
                logError(`Message: ${verifyError.response.data?.message || verifyError.message}`);
                logError(`Details: ${JSON.stringify(verifyError.response.data, null, 2)}`);
            } else {
                logError(`Verification failed: ${verifyError.message}`);
            }
        }

    } catch (error) {
        logError(`\nUnexpected error: ${error.message}`);
        if (error.stack) {
            logError(`Stack: ${error.stack}`);
        }
    }
}

// Run the test
testOTPRegistration()
    .then(() => {
        log('\nTest script completed.', 'yellow');
        process.exit(0);
    })
    .catch((error) => {
        logError(`\nTest script failed: ${error.message}`);
        process.exit(1);
    });

