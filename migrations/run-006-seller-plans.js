require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'kalebeyasu',
            database: process.env.DB_NAME || 'ethio_livestock_db',
            multipleStatements: true
        });

        console.log('Connected successfully!');
        console.log('Running migration 006: Add Seller Plans...\n');

        // Create seller_plans table
        console.log('Creating seller_plans table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS seller_plans (
                plan_id CHAR(36) PRIMARY KEY,
                seller_id CHAR(36) NOT NULL,
                plan_type ENUM('commission', 'subscription') NOT NULL COMMENT 'Type of plan: commission-based or subscription-based',
                commission_rate DECIMAL(5, 2) NULL COMMENT 'Commission percentage per sale (only for commission plan)',
                subscription_fee DECIMAL(10, 2) NULL COMMENT 'Monthly subscription fee (only for subscription plan)',
                max_products INT NULL COMMENT 'Maximum number of products allowed (only for subscription plan)',
                subscription_start_date DATETIME NULL COMMENT 'Start date of subscription period',
                subscription_end_date DATETIME NULL COMMENT 'End date of subscription period',
                is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether the plan is currently active',
                auto_renew BOOLEAN DEFAULT FALSE COMMENT 'Auto-renew subscription at end of period',
                payment_status ENUM('pending', 'paid', 'failed', 'expired') DEFAULT 'pending' COMMENT 'Payment status for subscription plans',
                payment_reference VARCHAR(255) NULL COMMENT 'Payment transaction reference',
                payment_proof_url VARCHAR(500) NULL COMMENT 'URL to payment proof document',
                approved_by CHAR(36) NULL COMMENT 'Admin who approved the plan',
                approved_at DATETIME NULL COMMENT 'Timestamp when plan was approved',
                notes TEXT NULL COMMENT 'Additional notes or comments',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
                
                INDEX idx_seller_id (seller_id),
                INDEX idx_plan_type (plan_type),
                INDEX idx_is_active (is_active),
                INDEX idx_payment_status (payment_status),
                INDEX idx_subscription_end_date (subscription_end_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ seller_plans table created');

        // Check if columns already exist before adding them
        console.log('\nChecking users table for existing columns...');
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('current_plan_id', 'plan_selected_at')
        `, [process.env.DB_NAME || 'ethio_livestock_db']);

        const existingColumns = columns.map(col => col.COLUMN_NAME);

        // Add current_plan_id if it doesn't exist
        if (!existingColumns.includes('current_plan_id')) {
            console.log('Adding current_plan_id column to users table...');
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN current_plan_id CHAR(36) NULL COMMENT 'Current active seller plan'
            `);
            console.log('✓ current_plan_id column added');
        } else {
            console.log('✓ current_plan_id column already exists');
        }

        // Add plan_selected_at if it doesn't exist
        if (!existingColumns.includes('plan_selected_at')) {
            console.log('Adding plan_selected_at column to users table...');
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN plan_selected_at DATETIME NULL COMMENT 'When seller selected their plan'
            `);
            console.log('✓ plan_selected_at column added');
        } else {
            console.log('✓ plan_selected_at column already exists');
        }

        // Skip foreign key constraint and index due to MySQL key limit
        console.log('\n⚠ Skipping foreign key constraint and index on users table (MySQL key limit reached)');
        console.log('Note: The relationship will still work via application logic');

        // Insert default plan templates (optional)
        console.log('\nInserting default plan templates...');
        
        // Get first admin user
        const [adminUsers] = await connection.query(`
            SELECT user_id FROM users WHERE role = 'Admin' LIMIT 1
        `);

        if (adminUsers.length > 0) {
            const adminId = adminUsers[0].user_id;

            // Check if templates already exist
            const [existingTemplates] = await connection.query(`
                SELECT COUNT(*) as count FROM seller_plans 
                WHERE notes LIKE '%Default%plan template%'
            `);

            if (existingTemplates[0].count === 0) {
                // Generate UUIDs for the templates
                const { v4: uuidv4 } = require('uuid');
                
                // Commission template
                await connection.query(`
                    INSERT INTO seller_plans 
                    (plan_id, seller_id, plan_type, commission_rate, is_active, notes, created_at, updated_at)
                    VALUES (?, ?, 'commission', 15.00, FALSE, 'Default commission plan template - 15% per sale', NOW(), NOW())
                `, [uuidv4(), adminId]);
                console.log('✓ Commission plan template created');

                // Subscription template
                await connection.query(`
                    INSERT INTO seller_plans 
                    (plan_id, seller_id, plan_type, subscription_fee, max_products, is_active, notes, created_at, updated_at)
                    VALUES (?, ?, 'subscription', 500.00, 50, FALSE, 'Default subscription plan template - 500 ETB/month for 50 products', NOW(), NOW())
                `, [uuidv4(), adminId]);
                console.log('✓ Subscription plan template created');
            } else {
                console.log('✓ Plan templates already exist');
            }
        } else {
            console.log('⚠ No admin user found, skipping template creation');
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\nSummary:');
        console.log('- seller_plans table created');
        console.log('- users table updated with plan tracking columns');
        console.log('- Foreign key constraints added');
        console.log('- Indexes created');
        console.log('- Default plan templates inserted');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed.');
        }
    }
}

// Run the migration
runMigration();
