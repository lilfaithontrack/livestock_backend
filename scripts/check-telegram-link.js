require('dotenv').config();
const { TelegramMapping } = require('../models');
const db = require('../models');

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

async function checkTelegramLink() {
    log('\n═══════════════════════════════════════════', 'bright');
    log('  Telegram Link Checker', 'bright');
    log('═══════════════════════════════════════════', 'bright');
    log(`\nChecking phone: ${TEST_PHONE}\n`, 'yellow');

    try {
        // Test database connection
        await db.sequelize.authenticate();
        log('✓ Database connection established', 'green');

        // Check if phone is linked
        const mapping = await TelegramMapping.findOne({
            where: { phone: TEST_PHONE }
        });

        if (mapping) {
            log('\n✓ Phone number IS linked to Telegram!', 'green');
            log('\nLink Details:', 'cyan');
            log(`  Phone: ${mapping.phone}`, 'blue');
            log(`  Telegram User ID: ${mapping.telegram_user_id}`, 'blue');
            log(`  Telegram Username: ${mapping.telegram_username || 'N/A'}`, 'blue');
            log(`  Verified: ${mapping.is_verified ? 'Yes' : 'No'}`, 'blue');
            log(`  Last OTP Sent: ${mapping.last_otp_sent_at || 'Never'}`, 'blue');
            log(`  Created: ${mapping.created_at}`, 'blue');
        } else {
            log('\n✗ Phone number is NOT linked to Telegram', 'red');
            log('\nTo link your phone:', 'yellow');
            log('1. Open Telegram and search for your bot', 'blue');
            log('2. Send: /start', 'blue');
            log(`3. Send: /link ${TEST_PHONE}`, 'blue');
            log('4. Wait for confirmation message', 'blue');
            log('\nAfter linking, run the test script again:', 'yellow');
            log('  npm run test:otp', 'cyan');
        }

        // Show all linked phones
        const allMappings = await TelegramMapping.findAll({
            order: [['created_at', 'DESC']],
            limit: 10
        });

        if (allMappings.length > 0) {
            log('\n═══════════════════════════════════════════', 'bright');
            log('  All Linked Phone Numbers:', 'bright');
            log('═══════════════════════════════════════════', 'bright');
            allMappings.forEach((m, index) => {
                log(`\n${index + 1}. ${m.phone}`, 'cyan');
                log(`   Telegram ID: ${m.telegram_user_id}`, 'blue');
                log(`   Username: ${m.telegram_username || 'N/A'}`, 'blue');
                log(`   Linked: ${m.created_at}`, 'blue');
            });
        }

        await db.sequelize.close();
        log('\n✓ Check completed', 'green');
    } catch (error) {
        log(`\n✗ Error: ${error.message}`, 'red');
        if (error.stack) {
            log(`Stack: ${error.stack}`, 'red');
        }
        process.exit(1);
    }
}

checkTelegramLink();

