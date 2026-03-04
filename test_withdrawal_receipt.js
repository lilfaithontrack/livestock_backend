const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User, SellerEarnings, SellerBankAccount, Order } = require('./models');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/v1';

async function runTest() {
    try {
        console.log('--- Starting Seller Withdrawal Test ---');

        // 1. Get Admin and Seller
        let admin = await User.findOne({ where: { role: 'Admin' } });
        let seller = await User.findOne({ where: { role: 'Seller' } });

        if (!admin) {
            admin = await User.create({ email: 'testadmin@livestock.com', phone: '0900000000', password_hash: '123456', role: 'Admin' });
        }
        if (!seller) {
            seller = await User.create({ email: 'testseller2@livestock.com', phone: '0911000003', password_hash: '123456', role: 'Seller' });
        }

        const adminToken = jwt.sign({ user_id: admin.user_id, role: admin.role }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_livestock', { expiresIn: '1d' });
        const sellerToken = jwt.sign({ user_id: seller.user_id, role: seller.role }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_livestock', { expiresIn: '1d' });

        // 2. Setup Seller Bank Account
        console.log('Setting up seller bank account...');
        let bankAccount = await SellerBankAccount.findOne({ where: { seller_id: seller.user_id } });
        if (!bankAccount) {
            bankAccount = await SellerBankAccount.create({
                seller_id: seller.user_id,
                bank_name: 'Commercial Bank of Ethiopia',
                account_name: 'Test Seller Account',
                account_number: '1000123456789',
                is_primary: true
            });
        }

        // 3. Setup Available Earnings for the Seller
        console.log('Setting up mock available earnings...');
        // Need an order to link to the earnings
        let order = await Order.findOne({ where: { order_status: 'Delivered' } });
        if (!order) {
            order = await Order.create({
                buyer_id: admin.user_id, // Dummy buyer just to satisfy constraints
                total_amount: 1500,
                payment_status: 'Paid',
                order_status: 'Delivered'
            });
        }

        await SellerEarnings.create({
            seller_id: seller.user_id,
            order_id: order.order_id,
            order_amount: 1500,
            commission_rate: 10,
            commission_amount: 150,
            net_amount: 1350,
            status: 'available',
            available_date: new Date()
        });

        // 4. Seller Requests Withdrawal
        console.log('Seller requesting withdrawal...');
        const withdrawalRes = await axios.post(`${API_URL}/withdrawals`, {
            amount: 1000,
            bank_account_id: bankAccount.account_id,
            notes: 'Test script withdrawal'
        }, { headers: { Authorization: `Bearer ${sellerToken}` } });

        const payoutId = withdrawalRes.data.payout.payout_id;
        console.log('Withdrawal Requested! Payout ID:', payoutId);

        // 5. Admin Approves Withdrawal
        console.log('Admin approving withdrawal...');
        await axios.put(`${API_URL}/withdrawals/${payoutId}/approve`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('Withdrawal Approved!');

        // 6. Admin Completes Withdrawal and Uploads Receipt
        console.log('Admin completing withdrawal with receipt URL...');
        const mockReceiptUrl = 'https://res.cloudinary.com/dummy/image/upload/v123456/dummy_receipt.pdf';

        await axios.put(`${API_URL}/withdrawals/${payoutId}/complete`, {
            payment_proof_url: mockReceiptUrl,
            transaction_reference: 'CBE-TXN-9999999',
            notes: 'Payment transferred successfully. Attached receipt.'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        console.log('Withdrawal Completed with missing payment proof!');

        // 7. Seller Fetches Withdrawal to Check Receipt
        console.log('Seller verifying withdrawal receipt...');
        const verifyRes = await axios.get(`${API_URL}/withdrawals/my/${payoutId}`, { headers: { Authorization: `Bearer ${sellerToken}` } });

        const finalWithdrawal = verifyRes.data.withdrawal;
        console.log('--------------------------------------------------');
        console.log(`Status: ${finalWithdrawal.status}`);
        console.log(`Amount: ${finalWithdrawal.amount}`);
        console.log(`Transaction Ref: ${finalWithdrawal.transaction_reference}`);
        console.log(`Payment Proof URL: ${finalWithdrawal.payment_proof_url}`);
        console.log('--------------------------------------------------');

        if (finalWithdrawal.payment_proof_url === mockReceiptUrl) {
            console.log('✅ TEST PASSED: Seller successfully sees the payment receipt URL uploaded by the Admin!');
        } else {
            console.log('❌ TEST FAILED: Payment receipt URL did not match or was not saved.');
        }

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

runTest();
