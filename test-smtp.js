/**
 * SMTP Test Script for cPanel
 * Tests sending OTP email directly without backend
 */

const nodemailer = require('nodemailer');

// cPanel SMTP credentials
const EMAIL_HOST = 'mail.shegergebeya.com';
const EMAIL_PORT = 465;
const EMAIL_USER = 'mail@shegergebeya.com';
const EMAIL_PASS = 'kalebeyasu';
const EMAIL_FROM = 'SHEGER_GEBEYA <mail@shegergebeya.com>';

// Test recipient
const TEST_EMAIL = 'kalu4mom@gmail.com';

async function testSMTP() {
    console.log('='.repeat(60));
    console.log('SMTP Test - cPanel Email');
    console.log('='.repeat(60));
    console.log(`Host: ${EMAIL_HOST}:${EMAIL_PORT}`);
    console.log(`User: ${EMAIL_USER}`);
    console.log(`From: ${EMAIL_FROM}`);
    console.log(`To: ${TEST_EMAIL}`);
    console.log('='.repeat(60));

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: true, // true for 465 (SSL)
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certs (common on cPanel)
        },
        debug: true, // Enable debug output
        logger: true  // Log to console
    });

    // Generate test OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 30px; }
            .otp-box { background: #F4320B; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0; }
            .info { color: #666; font-size: 14px; text-align: center; margin-top: 20px; }
            .warning { color: #e74c3c; font-size: 12px; text-align: center; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <h1 style="color: #F4320B; margin: 0;">Sheger Gebeya</h1>
            </div>
            <h2 style="text-align: center; color: #333;">Your Verification Code</h2>
            <div class="otp-box">${otp}</div>
            <p class="info">
                This code will expire in <strong>10 minutes</strong>.<br>
                Test email from SMTP script
            </p>
            <p class="warning">
                ⚠️ Do not share this code with anyone.
            </p>
        </div>
    </body>
    </html>
    `;

    try {
        // Verify connection first
        console.log('\n[1] Verifying SMTP connection...');
        await transporter.verify();
        console.log('✓ SMTP connection verified!\n');

        // Send email
        console.log('[2] Sending OTP email...');
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: TEST_EMAIL,
            subject: `${otp} - Your Sheger Gebeya Verification Code`,
            html: htmlContent,
            text: `Your verification code is: ${otp}. This code expires in 10 minutes.`
        });

        console.log('\n' + '='.repeat(60));
        console.log('✓ EMAIL SENT SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('Message ID:', info.messageId);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);
        console.log('Pending:', info.pending);
        console.log('='.repeat(60));
        console.log(`OTP sent: ${otp}`);
        console.log(`Check inbox: ${TEST_EMAIL}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.log('\n' + '='.repeat(60));
        console.log('✖ EMAIL FAILED');
        console.log('='.repeat(60));
        console.log('Error:', error.message);
        console.log('Code:', error.code);
        console.log('Command:', error.command);
        console.log('Response:', error.response);
        console.log('='.repeat(60));
        
        // Common cPanel issues
        console.log('\n[Common cPanel SMTP Issues]');
        console.log('1. Wrong port: Try 587 instead of 465');
        console.log('2. Wrong password: Check cPanel email password');
        console.log('3. SMTP not enabled: Enable in cPanel > Email Accounts');
        console.log('4. Firewall: Server may block outgoing SMTP');
        console.log('5. From address mismatch: Must match authenticated user');
    } finally {
        transporter.close();
    }
}

// Run test
testSMTP();
