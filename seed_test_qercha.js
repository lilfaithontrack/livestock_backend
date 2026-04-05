const { QerchaPackage, Product, User } = require('./models');
const sequelize = require('./config/database');

async function seedQercha() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Get the first user to be the host
        const user = await User.findOne();
        if (!user) {
            console.error('No users found in database.');
            return;
        }

        // Get the Arabian Horse product
        const product = await Product.findByPk('064dcbfa-5af8-441b-9978-d69f03e3c242');
        if (!product) {
            console.error('Arabian Horse product not found.');
            return;
        }

        // Create a Qercha package
        const [pkg, created] = await QerchaPackage.findOrCreate({
            where: { ox_product_id: product.product_id },
            defaults: {
                total_shares: 10,
                shares_available: 10,
                host_user_id: user.user_id,
                status: 'Active',
                category: 'Other'
            }
        });

        if (created) {
            console.log('Test Qercha package created for Arabian Horse.');
        } else {
            console.log('Qercha package already exists for Arabian Horse.');
            pkg.status = 'Active';
            await pkg.save();
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error.message);
        process.exit(1);
    }
}

seedQercha();
