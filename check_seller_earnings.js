const { User, SellerPlan, Order, SellerEarnings } = require('./models');
const { createEarning } = require('./controllers/earningsController');
const sequelize = require('./config/database');

async function verifyEarnings() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Find a seller with a subscription plan
        const subscriptionSeller = await User.findOne({
            include: [{
                model: SellerPlan,
                as: 'seller_plans',
                where: { plan_type: 'subscription', is_active: true, payment_status: 'paid' }
            }]
        });

        if (!subscriptionSeller) {
            console.log('No seller found with an active subscription plan. Creating one for testing...');
            // I'll skip creating one for now and just check the logic with a mockup if needed, 
            // but let's try to find any seller first.
            const anySeller = await User.findOne({ where: { role: 'Seller' } });
            if (!anySeller) {
                console.error('No sellers found in DB.');
                process.exit(1);
            }
            
            // Temporary change their plan to subscription for testing logic
            const [plan] = await SellerPlan.findOrCreate({
                where: { seller_id: anySeller.user_id },
                defaults: {
                    plan_type: 'subscription',
                    plan_name: 'Test Sub',
                    is_active: true,
                    payment_status: 'paid',
                    subscription_fee: 100,
                    max_products: 10
                }
            });
            await plan.update({ plan_type: 'subscription', is_active: true, payment_status: 'paid' });
            console.log(`Updated seller ${anySeller.email} to subscription plan for testing.`);
        }

        const seller = subscriptionSeller || await User.findOne({ where: { role: 'Seller' } });
        console.log(`Testing with seller: ${seller.email} (Role: ${seller.role})`);

        // 2. Create a dummy order
        const [order] = await Order.findOrCreate({
            where: { buyer_id: seller.user_id }, // Just for test
            defaults: {
                total_amount: 500,
                payment_status: 'Paid',
                order_status: 'Placed'
            }
        });

        console.log(`Attempting to create earning for order ${order.order_id} (Amount: 500)...`);
        
        // 3. Call createEarning
        const earning = await createEarning(order.order_id, seller.user_id, 500);

        if (earning === null) {
            console.log('❌ Result: createEarning returned NULL (Issue confirmed for subscription plans).');
        } else {
            console.log('✅ Result: Earning record created:', earning.toJSON());
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
}

verifyEarnings();
