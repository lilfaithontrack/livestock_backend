/**
 * Email OTP Test Script
 * Tests the complete OTP flow including email service initialization
 */

require('dotenv').config();
const { sendOTPEmail, initTransporter } = require('./services/emailService');

async function testEmailOTP() {
    console.log('='.repeat(70));
    console.log('EMAIL OTP SERVICE TEST');
    console.log('='.repeat(70));
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Email Host:', process.env.EMAIL_HOST);
    console.log('Email Port:', process.env.EMAIL_PORT);
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
    console.log('='.repeat(70));

    // Test email
    const testEmail = 'kalu4mom@gmail.com';
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('\n[1] Initializing email transporter...');
    const transporter = await initTransporter();
    
    if (!transporter) {
        console.error('✖ Failed to initialize email transporter');
        console.error('Please check your .env file has:');
        console.error('  - EMAIL_HOST=mail.shegergebeya.com');
        console.error('  - EMAIL_PORT=465');
        console.error('  - EMAIL_USER=mail@shegergebeya.com');
        console.error('  - EMAIL_PASS=your_password');
        process.exit(1);
    }
    console.log('✓ Transporter initialized');

    console.log('\n[2] Sending OTP email...');
    console.log(`To: ${testEmail}`);
    console.log(`OTP: ${testOTP}`);
    
    const success = await sendOTPEmail(testEmail, testOTP, null);

    console.log('\n' + '='.repeat(70));
    if (success) {
        console.log('✓ EMAIL SENT SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`Check inbox: ${testEmail}`);
        console.log(`OTP Code: ${testOTP}`);
    } else {
        console.log('✖ EMAIL FAILED TO SEND');
        console.log('='.repeat(70));
        console.log('Common issues:');
        console.log('1. Wrong email credentials in .env');
        console.log('2. Email account not configured in cPanel');
        console.log('3. SMTP port blocked by firewall');
        console.log('4. Email password incorrect');
    }
    console.log('='.repeat(70));

    process.exit(success ? 0 : 1);
}

testEmailOTP().catch(error => {
    console.error('\n✖ Test failed with error:', error);
    process.exit(1);
});
