#!/usr/bin/env node
/**
 * Apply Order Groups Migration using .env credentials
 * Run: node scripts/apply-migration-sql.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[!]${colors.reset} ${msg}`)
};

async function applyMigration() {
    console.log('\n=== Order Groups Migration (SQL via .env) ===\n');
    
    // Check .env variables
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };
    
    if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
        log.error('Missing database credentials in .env file');
        log.info('Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
        process.exit(1);
    }
    
    log.info(`Connecting to ${dbConfig.database}@${dbConfig.host}...`);
    
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        log.success('Connected to database\n');
        
        // Step 1: Create order_groups table
        log.info('Creating order_groups table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_groups (
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
        log.success('order_groups table created/verified');
        
        // Step 2: Check and add group_id to orders
        const [orderGroupIdExists] = await connection.query(
            "SHOW COLUMNS FROM orders WHERE Field = 'group_id'"
        );
        if (orderGroupIdExists.length === 0) {
            log.info('Adding group_id to orders table...');
            await connection.query(`
                ALTER TABLE orders 
                ADD COLUMN group_id CHAR(36) NULL,
                ADD INDEX idx_group_id (group_id)
            `);
            log.success('orders.group_id added');
        } else {
            log.warn('orders.group_id already exists');
        }
        
        // Step 3: Check and add seller_id to orders
        const [orderSellerIdExists] = await connection.query(
            "SHOW COLUMNS FROM orders WHERE Field = 'seller_id'"
        );
        if (orderSellerIdExists.length === 0) {
            log.info('Adding seller_id to orders table...');
            await connection.query(`
                ALTER TABLE orders 
                ADD COLUMN seller_id CHAR(36) NULL,
                ADD INDEX idx_seller_id (seller_id)
            `);
            log.success('orders.seller_id added');
        } else {
            log.warn('orders.seller_id already exists');
        }
        
        // Step 4: Check and add group_id to payments
        const [paymentGroupIdExists] = await connection.query(
            "SHOW COLUMNS FROM payments WHERE Field = 'group_id'"
        );
        if (paymentGroupIdExists.length === 0) {
            log.info('Adding group_id to payments table...');
            await connection.query(`
                ALTER TABLE payments 
                ADD COLUMN group_id CHAR(36) NULL,
                ADD INDEX idx_payment_group_id (group_id)
            `);
            log.success('payments.group_id added');
        } else {
            log.warn('payments.group_id already exists');
        }
        
        // Step 5: Add QR code columns if missing
        const [qrCodeExists] = await connection.query(
            "SHOW COLUMNS FROM orders WHERE Field = 'qr_code'"
        );
        if (qrCodeExists.length === 0) {
            log.info('Adding QR code columns to orders...');
            await connection.query(`
                ALTER TABLE orders 
                ADD COLUMN qr_code VARCHAR(255) NULL,
                ADD COLUMN qr_code_hash VARCHAR(255) NULL,
                ADD COLUMN delivery_otp_hash VARCHAR(255) NULL,
                ADD COLUMN delivery_otp_expires_at DATETIME NULL
            `);
            log.success('QR code columns added');
        } else {
            log.warn('QR code columns already exist');
        }
        
        // Step 6: Add all missing delivery columns at once
        const deliveryColumnsToAdd = [
            { field: 'assignment_type',          sql: "ADD COLUMN assignment_type ENUM('admin','seller','auto') DEFAULT 'admin'" },
            { field: 'seller_assigned_by',       sql: "ADD COLUMN seller_assigned_by CHAR(36) NULL" },
            { field: 'seller_delivery_agent_id', sql: "ADD COLUMN seller_delivery_agent_id CHAR(36) NULL" },
            { field: 'seller_notes',             sql: "ADD COLUMN seller_notes TEXT NULL" },
            { field: 'pickup_location',          sql: "ADD COLUMN pickup_location JSON NULL" },
            { field: 'delivery_location',        sql: "ADD COLUMN delivery_location JSON NULL" },
            { field: 'estimated_pickup_time',    sql: "ADD COLUMN estimated_pickup_time DATETIME NULL" },
            { field: 'actual_pickup_time',       sql: "ADD COLUMN actual_pickup_time DATETIME NULL" },
            { field: 'delivery_rating',          sql: "ADD COLUMN delivery_rating INT NULL" },
            { field: 'delivery_feedback',        sql: "ADD COLUMN delivery_feedback TEXT NULL" },
            { field: 'verification_method',      sql: "ADD COLUMN verification_method ENUM('qr','otp') NULL" },
            { field: 'distance_km',              sql: "ADD COLUMN distance_km DECIMAL(6,2) NULL" },
            { field: 'estimated_delivery_time',  sql: "ADD COLUMN estimated_delivery_time DATETIME NULL" },
            { field: 'actual_delivery_time',     sql: "ADD COLUMN actual_delivery_time DATETIME NULL" },
            { field: 'delivery_notes',           sql: "ADD COLUMN delivery_notes TEXT NULL" },
            { field: 'pickup_confirmed_at',      sql: "ADD COLUMN pickup_confirmed_at DATETIME NULL" },
            { field: 'delivery_confirmed_at',    sql: "ADD COLUMN delivery_confirmed_at DATETIME NULL" },
            { field: 'proof_of_delivery_data',   sql: "ADD COLUMN proof_of_delivery_data JSON NULL" },
        ];
        
        log.info('Checking deliveries table columns...');
        let deliveriesUpdated = false;
        for (const col of deliveryColumnsToAdd) {
            const [exists] = await connection.query(
                `SHOW COLUMNS FROM deliveries WHERE Field = '${col.field}'`
            );
            if (exists.length === 0) {
                await connection.query(`ALTER TABLE deliveries ${col.sql}`);
                log.success(`deliveries.${col.field} added`);
                deliveriesUpdated = true;
            }
        }
        if (!deliveriesUpdated) {
            log.warn('All delivery columns already exist');
        }
        
        // Step 9: Add location columns to products table
        const productLocationCols = [
            { field: 'region',        sql: "ADD COLUMN region VARCHAR(100) NULL COMMENT 'Ethiopia Region'" },
            { field: 'city',          sql: "ADD COLUMN city VARCHAR(100) NULL COMMENT 'City or admin area'" },
            { field: 'subcity',       sql: "ADD COLUMN subcity VARCHAR(100) NULL COMMENT 'Subcity/Zone'" },
            { field: 'woreda_kebele', sql: "ADD COLUMN woreda_kebele VARCHAR(100) NULL COMMENT 'Woreda or Kebele'" },
        ];

        log.info('Checking products location columns...');
        let productsUpdated = false;
        for (const col of productLocationCols) {
            const [exists] = await connection.query(
                `SHOW COLUMNS FROM products WHERE Field = '${col.field}'`
            );
            if (exists.length === 0) {
                await connection.query(`ALTER TABLE products ${col.sql}`);
                log.success(`products.${col.field} added`);
                productsUpdated = true;
            }
        }
        if (!productsUpdated) {
            log.warn('All product location columns already exist');
        }

        // Add indexes for location queries (ignore if already exist)
        const locationIndexes = [
            { name: 'idx_products_region',   sql: "CREATE INDEX idx_products_region ON products(region)" },
            { name: 'idx_products_city',     sql: "CREATE INDEX idx_products_city ON products(city)" },
            { name: 'idx_products_subcity',  sql: "CREATE INDEX idx_products_subcity ON products(subcity)" },
            { name: 'idx_products_location', sql: "CREATE INDEX idx_products_location ON products(region, city, subcity)" },
        ];
        for (const idx of locationIndexes) {
            try {
                await connection.query(idx.sql);
                log.success(`Index ${idx.name} created`);
            } catch (e) {
                if (e.code === 'ER_DUP_KEYNAME') {
                    log.warn(`Index ${idx.name} already exists`);
                } else {
                    throw e;
                }
            }
        }

        console.log('\n========================================');
        log.success('Migration completed successfully!');
        console.log('========================================\n');
        
        log.info('Summary:');
        console.log('  - order_groups table: ready');
        console.log('  - orders.group_id: ready');
        console.log('  - orders.seller_id: ready');
        console.log('  - payments.group_id: ready');
        console.log('  - orders QR columns: ready');
        console.log('  - deliveries.assignment_type: ready');
        console.log('  - deliveries.seller_assigned_by: ready');
        console.log('  - deliveries.seller_delivery_agent_id: ready\n');
        
        log.info('You can now run: npm run verify:multi-seller');
        
    } catch (error) {
        log.error(`Migration failed: ${error.message}`);
        if (error.sql) {
            console.log('SQL:', error.sql);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

applyMigration();
