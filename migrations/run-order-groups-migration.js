/**
 * Manual Order Groups Migration Runner
 * Run: node migrations/run-order-groups-migration.js
 */

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function runMigration() {
    console.log('=== Running Order Groups Migration ===\n');
    
    try {
        // Step 1: Check if order_groups table exists
        const [tables] = await sequelize.query(
            "SHOW TABLES LIKE 'order_groups'",
            { type: QueryTypes.SHOWTABLES }
        );
        
        if (tables.length > 0) {
            console.log('[SKIP] order_groups table already exists');
        } else {
            // Create order_groups table WITHOUT foreign key
            await sequelize.query(`
                CREATE TABLE order_groups (
                    group_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
                    buyer_id CHAR(36) NOT NULL,
                    total_amount DECIMAL(10,2) NOT NULL,
                    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
                    payment_proof_url VARCHAR(500),
                    shipping_address TEXT,
                    shipping_full_name VARCHAR(255),
                    shipping_phone VARCHAR(20),
                    shipping_city VARCHAR(100),
                    shipping_region VARCHAR(100),
                    shipping_notes TEXT,
                    order_type ENUM('regular', 'qercha') NOT NULL DEFAULT 'regular',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_buyer_id (buyer_id),
                    INDEX idx_payment_status (payment_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('[✓] Created order_groups table');
        }
        
        // Step 2: Check if orders table has group_id column
        const [orderColumns] = await sequelize.query(
            "SHOW COLUMNS FROM orders LIKE 'group_id'",
            { type: QueryTypes.SELECT }
        );
        
        if (orderColumns.length > 0) {
            console.log('[SKIP] orders.group_id column already exists');
        } else {
            await sequelize.query(`
                ALTER TABLE orders 
                ADD COLUMN group_id CHAR(36) NULL,
                ADD INDEX idx_group_id (group_id)
            `);
            console.log('[✓] Added orders.group_id column');
        }
        
        // Step 3: Check if orders table has seller_id column
        const [sellerIdColumn] = await sequelize.query(
            "SHOW COLUMNS FROM orders LIKE 'seller_id'",
            { type: QueryTypes.SELECT }
        );
        
        if (sellerIdColumn.length > 0) {
            console.log('[SKIP] orders.seller_id column already exists');
        } else {
            await sequelize.query(`
                ALTER TABLE orders 
                ADD COLUMN seller_id CHAR(36) NULL,
                ADD INDEX idx_seller_id (seller_id)
            `);
            console.log('[✓] Added orders.seller_id column');
        }
        
        // Step 4: Check if payments table has group_id column
        const [paymentColumns] = await sequelize.query(
            "SHOW COLUMNS FROM payments LIKE 'group_id'",
            { type: QueryTypes.SELECT }
        );
        
        if (paymentColumns.length > 0) {
            console.log('[SKIP] payments.group_id column already exists');
        } else {
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN group_id CHAR(36) NULL,
                ADD INDEX idx_payment_group_id (group_id)
            `);
            console.log('[✓] Added payments.group_id column');
        }
        
        console.log('\n=== Migration completed successfully! ===');
        console.log('\nSummary of changes:');
        console.log('- order_groups table created');
        console.log('- orders.group_id column added');
        console.log('- orders.seller_id column added');
        console.log('- payments.group_id column added');
        
    } catch (error) {
        console.error('\n[✗] Migration failed:', error.message);
        console.error(error.parent?.sqlMessage || '');
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run if executed directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
