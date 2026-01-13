const axios = require('axios');
const crypto = require('crypto');

const TELEBIRR_BASE_URL = 'https://api.ethiotelecom.et/payment';

/**
 * Telebirr Payment Gateway Service
 * Integration for Ethio Telecom's Telebirr mobile money
 */
class TelebirrService {
    constructor() {
        this.appId = process.env.TELEBIRR_APP_ID;
        this.appKey = process.env.TELEBIRR_APP_KEY;
        this.shortCode = process.env.TELEBIRR_SHORT_CODE;
        this.baseUrl = TELEBIRR_BASE_URL;
    }

    /**
     * Generate signature for Telebirr API requests
     * @param {Object} params - Request parameters
     * @returns {string} - HMAC signature
     */
    generateSignature(params) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        return crypto
            .createHmac('sha256', this.appKey)
            .update(sortedParams)
            .digest('hex')
            .toUpperCase();
    }

    /**
     * Encrypt payload for Telebirr API
     * @param {Object} payload - Data to encrypt
     * @returns {string} - Encrypted payload
     */
    encryptPayload(payload) {
        const publicKey = process.env.TELEBIRR_PUBLIC_KEY;
        if (!publicKey) {
            // Return base64 encoded JSON if no public key (for development)
            return Buffer.from(JSON.stringify(payload)).toString('base64');
        }

        const buffer = Buffer.from(JSON.stringify(payload));
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            buffer
        );
        return encrypted.toString('base64');
    }

    /**
     * Initialize a Telebirr payment
     * @param {Object} paymentData
     * @param {number} paymentData.amount - Amount in ETB
     * @param {string} paymentData.phone_number - Customer phone number
     * @param {string} paymentData.tx_ref - Unique transaction reference
     * @param {string} paymentData.callback_url - Webhook URL for payment confirmation
     * @param {string} paymentData.return_url - URL to redirect after payment
     * @param {string} paymentData.subject - Payment subject/description
     * @returns {Promise<Object>} - Payment URL and transaction reference
     */
    async initializePayment(paymentData) {
        try {
            const timestamp = Date.now().toString();
            const nonce = crypto.randomBytes(16).toString('hex');

            const ussdPayload = {
                appId: this.appId,
                shortCode: this.shortCode,
                outTradeNo: paymentData.tx_ref,
                subject: paymentData.subject || 'Ethio Livestock Payment',
                totalAmount: paymentData.amount.toString(),
                receiveName: 'Ethio Livestock',
                notifyUrl: paymentData.callback_url,
                returnUrl: paymentData.return_url,
                timeoutExpress: '30', // 30 minutes timeout
                nonce: nonce,
                timestamp: timestamp
            };

            // Add signature
            ussdPayload.sign = this.generateSignature(ussdPayload);

            // Encrypt the payload
            const encryptedPayload = this.encryptPayload(ussdPayload);

            const response = await axios.post(
                `${this.baseUrl}/v1/merchant/preOrder`,
                {
                    appid: this.appId,
                    sign: ussdPayload.sign,
                    ussd: encryptedPayload
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.code === '0' || response.data.code === 0) {
                return {
                    success: true,
                    checkout_url: response.data.data?.toPayUrl,
                    prepay_id: response.data.data?.prepayId,
                    tx_ref: paymentData.tx_ref
                };
            }

            return {
                success: false,
                message: response.data.msg || 'Failed to initialize Telebirr payment'
            };
        } catch (error) {
            console.error('Telebirr initialization error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.msg || error.message
            };
        }
    }

    /**
     * Verify a Telebirr payment status
     * @param {string} tx_ref - Transaction reference (outTradeNo)
     * @returns {Promise<Object>} - Payment verification result
     */
    async verifyPayment(tx_ref) {
        try {
            const timestamp = Date.now().toString();
            const nonce = crypto.randomBytes(16).toString('hex');

            const queryPayload = {
                appId: this.appId,
                outTradeNo: tx_ref,
                nonce: nonce,
                timestamp: timestamp
            };

            queryPayload.sign = this.generateSignature(queryPayload);

            const response = await axios.post(
                `${this.baseUrl}/v1/merchant/queryOrder`,
                {
                    appid: this.appId,
                    sign: queryPayload.sign,
                    ussd: this.encryptPayload(queryPayload)
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.code === '0' || response.data.code === 0) {
                const data = response.data.data;
                const tradeStatus = data?.tradeStatus;

                // Map Telebirr status to our status
                let status = 'pending';
                if (tradeStatus === 'Completed' || tradeStatus === 'SUCCESS') {
                    status = 'success';
                } else if (tradeStatus === 'Failed' || tradeStatus === 'FAIL') {
                    status = 'failed';
                } else if (tradeStatus === 'Cancelled' || tradeStatus === 'CANCEL') {
                    status = 'cancelled';
                }

                return {
                    success: status === 'success',
                    status: status,
                    amount: data?.totalAmount,
                    tx_ref: tx_ref,
                    trade_no: data?.tradeNo,
                    phone_number: data?.msisdn,
                    paid_at: data?.payTime,
                    verified_at: new Date().toISOString()
                };
            }

            return {
                success: false,
                status: 'failed',
                message: response.data.msg || 'Payment verification failed'
            };
        } catch (error) {
            console.error('Telebirr verification error:', error.response?.data || error.message);
            return {
                success: false,
                status: 'failed',
                message: error.response?.data?.msg || error.message
            };
        }
    }

    /**
     * Parse Telebirr webhook notification
     * @param {Object} notification - Webhook payload
     * @returns {Object} - Parsed payment result
     */
    parseWebhookNotification(notification) {
        try {
            // Verify signature if present
            const receivedSign = notification.sign;
            const { sign, ...params } = notification;
            const calculatedSign = this.generateSignature(params);

            if (receivedSign && receivedSign !== calculatedSign) {
                return {
                    success: false,
                    message: 'Invalid signature'
                };
            }

            const tradeStatus = notification.tradeStatus || notification.trade_status;
            let status = 'pending';
            if (tradeStatus === 'Completed' || tradeStatus === 'SUCCESS') {
                status = 'success';
            } else if (tradeStatus === 'Failed' || tradeStatus === 'FAIL') {
                status = 'failed';
            }

            return {
                success: status === 'success',
                status: status,
                tx_ref: notification.outTradeNo || notification.out_trade_no,
                trade_no: notification.tradeNo || notification.trade_no,
                amount: notification.totalAmount || notification.total_amount,
                phone_number: notification.msisdn
            };
        } catch (error) {
            console.error('Error parsing Telebirr webhook:', error);
            return {
                success: false,
                message: 'Failed to parse webhook notification'
            };
        }
    }

    /**
     * Generate a unique transaction reference
     * @param {string} prefix - Prefix for the reference
     * @returns {string} - Unique transaction reference
     */
    generateTxRef(prefix = 'TLB') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
}

module.exports = new TelebirrService();
