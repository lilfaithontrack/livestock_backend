const { Sequelize, DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('orders', {
    order_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_status: { type: DataTypes.ENUM('Placed', 'Paid', 'Approved', 'Assigned', 'In_Transit', 'Delivered', 'Cancelled') },
    payment_status: { type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded') },
    delivery_type: { type: DataTypes.ENUM('platform', 'seller', 'pickup') },
    assigned_agent_id: { type: DataTypes.UUID },
    total_amount: { type: DataTypes.DECIMAL(10, 2) }
});

async function checkOrders() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Check all orders with Paid payment status
        const allPaidOrders = await Order.findAll({
            where: {
                payment_status: 'Paid'
            }
        });
        console.log(`Total orders with payment_status='Paid': ${allPaidOrders.length}`);

        allPaidOrders.forEach(o => {
            console.log(`Order ${o.order_id}: Status=${o.order_status}, Type=${o.delivery_type}, Agent=${o.assigned_agent_id}`);
        });

        // Run the specific query used in controller
        const approvedOrders = await Order.findAll({
            where: {
                [Op.or]: [
                    { order_status: 'Approved' },
                    {
                        payment_status: 'Paid',
                        order_status: { [Op.notIn]: ['Assigned', 'In_Transit', 'Delivered', 'Cancelled'] }
                    }
                ],
                delivery_type: 'platform',
                assigned_agent_id: null
            }
        });

        console.log(`\nQuery result count: ${approvedOrders.length}`);
        approvedOrders.forEach(o => {
            console.log(`MATCHED: Order ${o.order_id}: Status=${o.order_status}, Payment=${o.payment_status}`);
        });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkOrders();
