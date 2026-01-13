const axios = require('axios');

const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

/**
 * Chapa Payment Gateway Service
 * Documentation: https://developer.chapa.co/
 */
class ChapaService {
    constructor() {
        this.secretKey = process.env.CHAPA_SECRET_KEY;
        this.publicKey = process.env.CHAPA_PUBLIC_KEY;
        this.baseUrl = CHAPA_BASE_URL;
    }

    /**
     * Initialize a Chapa payment
     * @param {Object} paymentData
     * @param {number} paymentData.amount - Amount in ETB
     * @param {string} paymentData.email - Customer email
     * @param {string} paymentData.phone_number - Customer phone (optional)
     * @param {string} paymentData.first_name - Customer first name
     * @param {string} paymentData.last_name - Customer last name
     * @param {string} paymentData.tx_ref - Unique transaction reference
     * @param {string} paymentData.callback_url - Webhook URL for payment confirmation
     * @param {string} paymentData.return_url - URL to redirect after payment
     * @param {string} paymentData.customization - Payment page customization (optional)
     * @returns {Promise<Object>} - Checkout URL and transaction reference
     */
    async initializePayment(paymentData) {
        try {
            const payload = {
                amount: paymentData.amount,
                currency: 'ETB',
                email: paymentData.email,
                phone_number: paymentData.phone_number,
                first_name: paymentData.first_name || 'Customer',
                last_name: paymentData.last_name || '',
                tx_ref: paymentData.tx_ref,
                callback_url: paymentData.callback_url,
                return_url: paymentData.return_url,
                customization: paymentData.customization || {
                    title: 'Ethio Livestock',
                    description: 'Payment for your order'
                }
            };

            const response = await axios.post(
                `${this.baseUrl}/transaction/initialize`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.status === 'success') {
                return {
                    success: true,
                    checkout_url: response.data.data.checkout_url,
                    tx_ref: paymentData.tx_ref
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to initialize payment'
            };
        } catch (error) {
            console.error('Chapa initialization error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Verify a Chapa payment
     * @param {string} tx_ref - Transaction reference
     * @returns {Promise<Object>} - Payment verification result
     */
    async verifyPayment(tx_ref) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/transaction/verify/${tx_ref}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`
                    }
                }
            );

            if (response.data.status === 'success') {
                const data = response.data.data;
                return {
                    success: true,
                    status: data.status, // 'success', 'pending', 'failed'
                    amount: data.amount,
                    currency: data.currency,
                    tx_ref: data.tx_ref,
                    reference: data.reference,
                    payment_method: data.payment_method,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    phone_number: data.phone_number,
                    created_at: data.created_at,
                    verified_at: new Date().toISOString()
                };
            }

            return {
                success: false,
                status: 'failed',
                message: response.data.message || 'Payment verification failed'
            };
        } catch (error) {
            console.error('Chapa verification error:', error.response?.data || error.message);
            return {
                success: false,
                status: 'failed',
                message: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Generate a unique transaction reference
     * @param {string} prefix - Prefix for the reference (e.g., 'ORD')
     * @returns {string} - Unique transaction reference
     */
    generateTxRef(prefix = 'ETL') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
}

module.exports = new ChapaService();
