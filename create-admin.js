require('dotenv').config();
const { User } = require('./models');

/**
 * Script to create an admin user
 * Run with: node create-admin.js
 */

async function createAdminUser() {
    try {
        console.log('🔧 Creating admin user...');

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: { email: 'admin@ethiolivestock.com' }
        });

        if (existingAdmin) {
            console.log('✅ Admin user already exists!');
            console.log('📧 Email: admin@ethiolivestock.com');
            console.log('🔐 Password: admin123');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            role: 'Admin',
            email: 'admin@ethiolivestock.com',
            password_hash: 'admin123', // Will be hashed by the model
            name: 'Administrator',
            kyc_status: 'Verified'
        });

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@ethiolivestock.com');
        console.log('🔐 Password: admin123');
        console.log('👤 User ID:', admin.user_id);

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the script
createAdminUser();
