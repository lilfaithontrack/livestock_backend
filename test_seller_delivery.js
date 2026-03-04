const axios = require('axios');
const { User, Product, Order, Delivery } = require('./models');

const API_URL = 'http://localhost:5000/api/v1';

async function runTest() {
    try {
        console.log('--- Starting Seller Delivery Test ---');

        console.log('1. Finding a test seller and buyer...');
        let seller = await User.findOne({ where: { role: 'Seller' } });
        let buyer = await User.findOne({ where: { role: 'Buyer' } });

        if (!seller) {
            seller = await User.create({ email: 'testseller@livestock.com', phone: '0911000001', password_hash: '123456', role: 'Seller' });
        }
        if (!buyer) {
            buyer = await User.create({ email: 'testbuyer@livestock.com', phone: '0911000002', password_hash: '123456', role: 'Buyer' });
        }

        // Login to get tokens (using bypass or normal login if we know password)
        // Actually, let's just create a token manually for testing to avoid password issues
        const jwt = require('jsonwebtoken');
        const sellerToken = jwt.sign({ user_id: seller.user_id, role: seller.role }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_livestock', { expiresIn: '1d' });
        const buyerToken = jwt.sign({ user_id: buyer.user_id, role: buyer.role }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_livestock', { expiresIn: '1d' });

        console.log('2. Finding a test product for seller...');
        let product = await Product.findOne({ where: { seller_id: seller.user_id } });

        if (!product) {
            // Find any existing product and just assign to this seller for testing
            product = await Product.findOne();
            if (product) {
                await product.update({ seller_id: seller.user_id });
            } else {
                console.log('No products in DB to test with. Please create a product first.');
                return;
            }
        }

        console.log('3. Buyer creates an order...');
        const orderRes = await axios.post(`${API_URL}/orders/checkout`, {
            items: [{ product_id: product.product_id, quantity: 1 }],
            shipping_address: '123 Test St',
            shipping_phone: '0911123456'
        }, { headers: { Authorization: `Bearer ${buyerToken}` } });

        let orderId = orderRes.data.order_id || orderRes.data.data?.order_id;
        console.log('Order created:', orderId);

        console.log('4. Marking order as Paid directly in DB...');
        await Order.update({ payment_status: 'Paid', order_status: 'Paid' }, { where: { order_id: orderId } });

        console.log('5. Seller fetches their orders...');
        const sellerOrdersRes = await axios.get(`${API_URL}/orders/seller`, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Seller orders found:', sellerOrdersRes.data.data?.orders?.length || sellerOrdersRes.data.orders?.length);

        console.log('6. Seller opts for self-delivery...');
        const selfDeliverRes = await axios.post(`${API_URL}/deliveries/seller/orders/${orderId}/self-deliver`, {}, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Self deliver response:', selfDeliverRes.data.message);

        console.log('7. Seller triggers resend OTP to Buyer...');
        const resendRes = await axios.post(`${API_URL}/deliveries/orders/${orderId}/resend-otp`, {}, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Resend OTP response:', resendRes.data.message);

        console.log('8. Seller confirms pickup...');
        const pickupRes = await axios.post(`${API_URL}/deliveries/agent/orders/${orderId}/pickup`, {}, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Pickup response:', pickupRes.data.message);

        console.log('9. Fetching the generated OTP from logs or DB (for test purposes)...');
        // We can't see the unhashed OTP in the DB, so we get it from the `resendRes` if we are in development mode!
        let otp = resendRes.data.data?.otp || resendRes.data.otp;
        console.log('Extracted OTP:', otp);

        if (!otp) {
            console.log('OTP not found in response (check if NODE_ENV=development is set).');
            return;
        }

        console.log('10. Seller verifies delivery with the OTP...');
        const verifyRes = await axios.post(`${API_URL}/deliveries/agent/orders/${orderId}/verify`, {
            verification_type: 'otp',
            code: otp
        }, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Verify response:', verifyRes.data.message);

        const finalOrder = await Order.findByPk(orderId);
        console.log('Final Order Status:', finalOrder.order_status); // Should be Delivered

        console.log('--- Test Completed Successfully ---');

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

runTest();
