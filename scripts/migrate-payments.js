/**
 * Migration script to add payment gateway columns to payments table
 * Run with: node scripts/migrate-payments.js
 */

const sequelize = require('../config/database');

async function migratePayments() {
    console.log('Starting payments table migration...');

    try {
        // Check if columns already exist
        const [results] = await sequelize.query(`SHOW COLUMNS FROM payments`);
        const existingColumns = results.map(r => r.Field);

        console.log('Existing columns:', existingColumns);

        // Add payment_method column if not exists
        if (!existingColumns.includes('payment_method')) {
            console.log('Adding payment_method column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN payment_method ENUM('chapa', 'telebirr', 'screenshot', 'cash') 
                NOT NULL DEFAULT 'screenshot' 
                AFTER gateway_used
            `);
        }

        // Add status column if not exists
        if (!existingColumns.includes('status')) {
            console.log('Adding status column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN status ENUM('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded') 
                DEFAULT 'pending' 
                AFTER payment_method
            `);
        }

        // Add currency column if not exists
        if (!existingColumns.includes('currency')) {
            console.log('Adding currency column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN currency VARCHAR(10) DEFAULT 'ETB' 
                AFTER amount
            `);
        }

        // Add phone_number column if not exists
        if (!existingColumns.includes('phone_number')) {
            console.log('Adding phone_number column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN phone_number VARCHAR(20) NULL 
                AFTER currency
            `);
        }

        // Add email column if not exists
        if (!existingColumns.includes('email')) {
            console.log('Adding email column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN email VARCHAR(255) NULL 
                AFTER phone_number
            `);
        }

        // Add checkout_url column if not exists
        if (!existingColumns.includes('checkout_url')) {
            console.log('Adding checkout_url column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN checkout_url VARCHAR(500) NULL 
                AFTER email
            `);
        }

        // Add gateway_reference column if not exists
        if (!existingColumns.includes('gateway_reference')) {
            console.log('Adding gateway_reference column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN gateway_reference VARCHAR(255) NULL 
                AFTER checkout_url
            `);
        }

        // Add verified_at column if not exists
        if (!existingColumns.includes('verified_at')) {
            console.log('Adding verified_at column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN verified_at DATETIME NULL 
                AFTER gateway_reference
            `);
        }

        // Add metadata column if not exists
        if (!existingColumns.includes('metadata')) {
            console.log('Adding metadata column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN metadata JSON NULL 
                AFTER verified_at
            `);
        }

        // Add notes column if not exists
        if (!existingColumns.includes('notes')) {
            console.log('Adding notes column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN notes TEXT NULL 
                AFTER commission_rate
            `);
        }

        // Make order_id nullable
        console.log('Making order_id nullable...');
        await sequelize.query(`
            ALTER TABLE payments 
            MODIFY COLUMN order_id CHAR(36) NULL
        `);

        console.log('✓ Migration completed successfully!');

        // Show updated columns
        const [updatedResults] = await sequelize.query(`SHOW COLUMNS FROM payments`);
        console.log('\nUpdated columns:');
        updatedResults.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

migratePayments()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
