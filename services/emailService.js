/**
 * Email OTP Service
 * Sends OTPs via email using nodemailer (works with cPanel email)
 */

const nodemailer = require('nodemailer');

// Email configuration - cPanel settings
const EMAIL_HOST = process.env.EMAIL_HOST || 'mail.shegergebeya.com'; // Your cPanel mail server
const EMAIL_PORT = process.env.EMAIL_PORT || 465; // Use 465 for SSL, 587 for TLS
const EMAIL_USER = process.env.EMAIL_USER || 'otp@shegergebeya.com';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Ethio Livestock <otp@shegergebeya.com>';

// Create transporter
let transporter = null;

const initTransporter = () => {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('⚠️ Email not configured. Set EMAIL_USER and EMAIL_PASS in .env');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT),
        secure: parseInt(EMAIL_PORT) === 465, // true for 465, false for 587
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false // Allows self-signed certs (common on cPanel)
        }
    });

    console.log(`✓ Email service configured (${EMAIL_HOST}:${EMAIL_PORT})`);
    return transporter;
};

/**
 * Send OTP via email
 * @param {string} email - Recipient email address
 * @param {string} otp - OTP code
 * @param {string} phone - Phone number (for context)
 * @returns {Promise<boolean>}
 */
const sendOTPEmail = async (email, otp, phone) => {
    if (!transporter) {
        initTransporter();
    }

    if (!transporter) {
        console.error('Email service not available');
        return false;
    }

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
                <h1 style="color: #F4320B; margin: 0;">Ethio Livestock</h1>
            </div>
            <h2 style="text-align: center; color: #333;">Your Verification Code</h2>
            <div class="otp-box">${otp}</div>
            <p class="info">
                This code will expire in <strong>10 minutes</strong>.<br>
                Phone: ${phone || 'N/A'}
            </p>
            <p class="warning">
                ⚠️ Do not share this code with anyone. We will never ask for your OTP.
            </p>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: `${otp} - Your Ethio Livestock Verification Code`,
            html: htmlContent,
            text: `Your verification code is: ${otp}. This code expires in 10 minutes. Do not share this code.`
        });

        console.log(`✓ OTP email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error.message);
        return false;
    }
};

// Initialize on load
initTransporter();

module.exports = {
    sendOTPEmail,
    initTransporter
};
