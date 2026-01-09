require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const TEST_PHONE = process.env.TEST_PHONE || '+251909837925';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
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

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

function logLink(message) {
    log(message, 'magenta');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAutoLinkOTP() {
    log('\n═══════════════════════════════════════════', 'bright');
    log('  Automatic Telegram Linking & OTP Test', 'bright');
    log('═══════════════════════════════════════════', 'bright');
    log(`\nTesting phone: ${TEST_PHONE}`, 'yellow');
    log(`API Base URL: ${API_BASE_URL}\n`, 'yellow');

    let otp = null;
    let token = null;
    let deepLink = null;
    let linkingToken = null;

    try {
        // Step 1: Request OTP (should return deep link if not linked)
        logStep(1, 'Requesting OTP for phone number...');
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login/phone`, {
                phone: TEST_PHONE
            });

            if (response.data.success) {
                logSuccess('OTP request successful!');
                logInfo(`Message: ${response.data.message}`);
                
                const data = response.data.data || {};
                
                // Check if Telegram is linked
                if (data.telegram_linked) {
                    logSuccess('Phone is already linked to Telegram!');
                    if (data.otp) {
                        otp = data.otp;
                        logSuccess(`OTP received: ${otp}`);
                    } else {
                        logInfo('OTP sent via Telegram. Check your Telegram for the code.');
                        logWarning('For testing, you may need to check Telegram or server logs.');
                        return;
                    }
                } else {
                    logWarning('Phone is NOT linked to Telegram yet.');
                    
                    // Check for deep link
                    if (data.telegram_deep_link) {
                        deepLink = data.telegram_deep_link;
                        linkingToken = data.linking_token;
                        logSuccess('Deep link generated for automatic linking!');
                        log('\n═══════════════════════════════════════════', 'bright');
                        log('  🔗 TELEGRAM DEEP LINK:', 'bright');
                        log('═══════════════════════════════════════════', 'bright');
                        logLink(`\n${deepLink}\n`);
                        log('═══════════════════════════════════════════', 'bright');
                        logInfo('\nInstructions:');
                        logInfo('1. Copy the link above');
                        logInfo('2. Open it in your browser or Telegram app');
                        logInfo('3. This will automatically link your phone to Telegram');
                        logInfo('4. The OTP will be sent to you via Telegram');
                        logInfo('5. After linking, wait a moment then continue...\n');
                        
                        // In development, OTP is also returned
                        if (data.otp) {
                            otp = data.otp;
                            logSuccess(`OTP (for testing): ${otp}`);
                            logInfo('You can use this OTP directly, or click the link to test auto-linking');
                        }
                    } else {
                        logWarning('No deep link generated. Check bot configuration.');
                        if (data.otp) {
                            otp = data.otp;
                            logSuccess(`OTP received: ${otp}`);
                        }
                    }
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

        // Step 2: Wait for user to click link (if deep link was provided)
        if (deepLink && !otp) {
            logStep(2, 'Waiting for Telegram linking...');
            logInfo('Please click the deep link above to link your Telegram.');
            logInfo('Waiting 30 seconds for you to complete the linking...');
            logWarning('(You can also press Ctrl+C and use the OTP directly if provided)');
            
            await sleep(30000); // Wait 30 seconds
            
            logInfo('Checking if phone is now linked...');
            
            // Try requesting OTP again to see if it's now linked
            try {
                const checkResponse = await axios.post(`${API_BASE_URL}/auth/login/phone`, {
                    phone: TEST_PHONE
                });
                
                if (checkResponse.data.success && checkResponse.data.data?.telegram_linked) {
                    logSuccess('Phone is now linked! OTP should be in your Telegram.');
                    logInfo('Check your Telegram for the OTP code.');
                    logWarning('For automated testing, we\'ll use the OTP from response if available.');
                    
                    if (checkResponse.data.data.otp) {
                        otp = checkResponse.data.data.otp;
                        logSuccess(`OTP received: ${otp}`);
                    } else {
                        logError('OTP not in response. Please check Telegram manually.');
                        return;
                    }
                } else {
                    logWarning('Phone still not linked. Using OTP from first request if available.');
                    if (!otp) {
                        logError('No OTP available. Please check Telegram or server logs.');
                        return;
                    }
                }
            } catch (checkError) {
                logWarning('Could not check linking status. Using OTP from first request.');
            }
        }

        // Step 3: Verify OTP
        if (!otp) {
            logError('No OTP available. Cannot proceed with verification.');
            logInfo('Possible reasons:');
            logInfo('1. Phone not linked and OTP not returned in development mode');
            logInfo('2. OTP was sent via Telegram but not retrieved');
            logInfo('3. Check server logs for OTP value');
            return;
        }

        logStep(3, 'Verifying OTP...');
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
                
                // Step 4: Test authenticated endpoint
                logStep(4, 'Testing authenticated endpoint...');
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
                        logWarning(`Auth test: ${authError.response?.data?.message || authError.message}`);
                    }
                }

                // Step 5: Test second OTP request (should now be linked)
                if (deepLink) {
                    logStep(5, 'Testing second OTP request (should be auto-linked now)...');
                    logInfo('Requesting another OTP to verify automatic Telegram delivery...');
                    
                    await sleep(2000); // Wait a bit
                    
                    try {
                        const secondResponse = await axios.post(`${API_BASE_URL}/auth/login/phone`, {
                            phone: TEST_PHONE
                        });
                        
                        if (secondResponse.data.success) {
                            if (secondResponse.data.data?.telegram_linked) {
                                logSuccess('Phone is linked! OTP sent via Telegram automatically.');
                                logInfo('Check your Telegram for the new OTP.');
                            } else {
                                logWarning('Phone still not linked. Deep link may not have been clicked.');
                            }
                        }
                    } catch (secondError) {
                        logWarning('Second OTP request test skipped due to error');
                    }
                }

                log('\n═══════════════════════════════════════════', 'bright');
                log('  ✓ Automatic Linking Test Completed!', 'green');
                log('═══════════════════════════════════════════', 'bright');
                
                if (deepLink) {
                    log('\nSummary:', 'cyan');
                    logInfo('✓ Deep link generated successfully');
                    logInfo('✓ OTP verification worked');
                    logInfo('✓ User authenticated');
                    if (token) {
                        logInfo('✓ JWT token received');
                    }
                    logWarning('\nNote: To fully test auto-linking, click the deep link above');
                    logWarning('and request another OTP to see it sent automatically via Telegram.');
                }
                
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
testAutoLinkOTP()
    .then(() => {
        log('\nTest script completed.', 'yellow');
        process.exit(0);
    })
    .catch((error) => {
        logError(`\nTest script failed: ${error.message}`);
        process.exit(1);
    });

