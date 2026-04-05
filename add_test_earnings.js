const sequelize = require('./config/database');
const { User, Order, SellerEarnings } = require('./models');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Find the user
        const email = 'gettuabebe@gmail.com';
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            return;
        }

        console.log(`Found user: ${user.user_id}`);

        // Find or create a dummy order
        let order = await Order.findOne();
        if (!order) {
            // Need a system order or we create a fake one
            order = await Order.create({
                buyer_id: user.user_id, // we can just use the seller as buyer for the test order
                total_amount: 1000,
                payment_status: 'Paid',
                order_status: 'Delivered',
                shipping_address: 'Test Address',
                shipping_phone: '0900000000',
                shipping_city: 'Addis Ababa'
            });
            console.log(`Created dummy order: ${order.order_id}`);
        } else {
            console.log(`Using existing order: ${order.order_id}`);
        }

        // Add 'available' earning (for Wallet Balance)
        const earning1 = await SellerEarnings.create({
            seller_id: user.user_id,
            order_id: order.order_id,
            order_amount: 5000,
            commission_rate: 15,
            commission_amount: 750,
            net_amount: 4250,
            status: 'available',
            available_date: new Date()
        });

        // Add 'pending' earning (Totalling 4250 + 2500 = 6750 for Total Earnings)
        const earning2 = await SellerEarnings.create({
            seller_id: user.user_id,
            order_id: order.order_id,
            order_amount: 3000,
            commission_rate: 15,
            commission_amount: 500,
            net_amount: 2500,
            status: 'pending',
            available_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        console.log('Successfully created test earnings!');
        console.log(`Added Available Earning: ETB 4250 (ID: ${earning1.earning_id})`);
        console.log(`Added Pending Earning: ETB 2500 (ID: ${earning2.earning_id})`);
        console.log(`\nExpected Wallet Balance: ETB 4250`);
        console.log(`Expected Total Earnings: ETB 6750`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

run();
