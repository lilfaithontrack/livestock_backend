/**
 * Migration Runner for Delivery System Enhancements
 * Run with: node migrations/run-007-delivery-system.js
 */

const sequelize = require('../config/database');

async function runMigration() {
    try {
        console.log('Starting delivery system migration...');

        // Update order_status enum
        console.log('Updating order_status enum...');
        await sequelize.query(`
            ALTER TABLE orders 
            MODIFY COLUMN order_status ENUM('Placed', 'Paid', 'Approved', 'Assigned', 'In_Transit', 'Delivered', 'Cancelled') DEFAULT 'Placed'
        `).catch(e => console.log('order_status enum may already be updated:', e.message));

        // Add delivery fields to orders
        const orderColumns = [
            { name: 'delivery_type', sql: `ADD COLUMN delivery_type ENUM('platform', 'seller', 'pickup') DEFAULT 'platform'` },
            { name: 'seller_can_deliver', sql: `ADD COLUMN seller_can_deliver BOOLEAN DEFAULT FALSE` },
            { name: 'qr_code', sql: `ADD COLUMN qr_code VARCHAR(64) NULL` },
            { name: 'qr_code_hash', sql: `ADD COLUMN qr_code_hash VARCHAR(255) NULL` },
            { name: 'delivery_otp_hash', sql: `ADD COLUMN delivery_otp_hash VARCHAR(255) NULL` },
            { name: 'delivery_otp_expires_at', sql: `ADD COLUMN delivery_otp_expires_at DATETIME NULL` },
            { name: 'assigned_agent_id', sql: `ADD COLUMN assigned_agent_id CHAR(36) NULL` },
            { name: 'approved_at', sql: `ADD COLUMN approved_at DATETIME NULL` },
            { name: 'approved_by', sql: `ADD COLUMN approved_by CHAR(36) NULL` },
            { name: 'picked_up_at', sql: `ADD COLUMN picked_up_at DATETIME NULL` },
            { name: 'delivered_at', sql: `ADD COLUMN delivered_at DATETIME NULL` },
            { name: 'seller_location_lat', sql: `ADD COLUMN seller_location_lat DECIMAL(10, 8) NULL` },
            { name: 'seller_location_lng', sql: `ADD COLUMN seller_location_lng DECIMAL(11, 8) NULL` },
            { name: 'buyer_location_lat', sql: `ADD COLUMN buyer_location_lat DECIMAL(10, 8) NULL` },
            { name: 'buyer_location_lng', sql: `ADD COLUMN buyer_location_lng DECIMAL(11, 8) NULL` }
        ];

        for (const col of orderColumns) {
            console.log(`Adding column ${col.name} to orders...`);
            await sequelize.query(`ALTER TABLE orders ${col.sql}`)
                .catch(e => console.log(`Column ${col.name} may already exist:`, e.message));
        }

        // Add agent location fields to users
        const userColumns = [
            { name: 'current_lat', sql: `ADD COLUMN current_lat DECIMAL(10, 8) NULL` },
            { name: 'current_lng', sql: `ADD COLUMN current_lng DECIMAL(11, 8) NULL` },
            { name: 'is_online', sql: `ADD COLUMN is_online BOOLEAN DEFAULT FALSE` },
            { name: 'last_location_update', sql: `ADD COLUMN last_location_update DATETIME NULL` },
            { name: 'max_delivery_radius_km', sql: `ADD COLUMN max_delivery_radius_km DECIMAL(5, 2) DEFAULT 10.00` }
        ];

        for (const col of userColumns) {
            console.log(`Adding column ${col.name} to users...`);
            await sequelize.query(`ALTER TABLE users ${col.sql}`)
                .catch(e => console.log(`Column ${col.name} may already exist:`, e.message));
        }

        // Update deliveries table status enum
        console.log('Updating deliveries status enum...');
        await sequelize.query(`
            ALTER TABLE deliveries 
            MODIFY COLUMN status ENUM('Pending', 'Assigned', 'In_Transit', 'Delivered', 'Failed', 'Cancelled') DEFAULT 'Pending'
        `).catch(e => console.log('deliveries status enum may already be updated:', e.message));

        // Add new fields to deliveries
        const deliveryColumns = [
            { name: 'pickup_confirmed_at', sql: `ADD COLUMN pickup_confirmed_at DATETIME NULL` },
            { name: 'delivery_confirmed_at', sql: `ADD COLUMN delivery_confirmed_at DATETIME NULL` },
            { name: 'verification_method', sql: `ADD COLUMN verification_method ENUM('qr', 'otp') NULL` },
            { name: 'distance_km', sql: `ADD COLUMN distance_km DECIMAL(6, 2) NULL` },
            { name: 'estimated_delivery_time', sql: `ADD COLUMN estimated_delivery_time DATETIME NULL` },
            { name: 'actual_delivery_time', sql: `ADD COLUMN actual_delivery_time DATETIME NULL` },
            { name: 'delivery_notes', sql: `ADD COLUMN delivery_notes TEXT NULL` }
        ];

        for (const col of deliveryColumns) {
            console.log(`Adding column ${col.name} to deliveries...`);
            await sequelize.query(`ALTER TABLE deliveries ${col.sql}`)
                .catch(e => console.log(`Column ${col.name} may already exist:`, e.message));
        }

        // Create indexes
        console.log('Creating indexes...');
        await sequelize.query(`
            CREATE INDEX idx_orders_delivery_status ON orders(order_status, delivery_type, assigned_agent_id)
        `).catch(e => console.log('Index may already exist:', e.message));

        await sequelize.query(`
            CREATE INDEX idx_users_agent_location ON users(current_lat, current_lng, is_online)
        `).catch(e => console.log('Index may already exist:', e.message));

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
