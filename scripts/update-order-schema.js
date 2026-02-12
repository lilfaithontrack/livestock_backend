const sequelize = require('../config/database');

async function updateSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // 1. Update order_status ENUM
        console.log('Updating order_status ENUM...');
        try {
            await sequelize.query("ALTER TABLE orders MODIFY COLUMN order_status ENUM('Placed', 'Paid', 'Approved', 'Assigned', 'In_Transit', 'Delivered', 'Cancelled') DEFAULT 'Placed'");
        } catch (e) {
            console.log('Error updating order_status (might already exist):', e.message);
        }

        // 2. Add missing columns
        const columnsToAdd = [
            "ADD COLUMN order_type ENUM('regular', 'qercha') DEFAULT 'regular' NOT NULL",
            "ADD COLUMN delivery_type ENUM('platform', 'seller', 'pickup') DEFAULT 'platform'",
            "ADD COLUMN seller_can_deliver TINYINT(1) DEFAULT 0",
            "ADD COLUMN qr_code VARCHAR(64) NULL",
            "ADD COLUMN qr_code_hash VARCHAR(255) NULL",
            "ADD COLUMN delivery_otp_hash VARCHAR(255) NULL",
            "ADD COLUMN delivery_otp_expires_at DATETIME NULL",
            "ADD COLUMN assigned_agent_id CHAR(36) NULL",
            "ADD COLUMN approved_at DATETIME NULL",
            "ADD COLUMN approved_by CHAR(36) NULL",
            "ADD COLUMN picked_up_at DATETIME NULL",
            "ADD COLUMN delivered_at DATETIME NULL",
            "ADD COLUMN seller_location_lat DECIMAL(10, 8) NULL",
            "ADD COLUMN seller_location_lng DECIMAL(11, 8) NULL",
            "ADD COLUMN buyer_location_lat DECIMAL(10, 8) NULL",
            "ADD COLUMN buyer_location_lng DECIMAL(11, 8) NULL"
        ];

        for (const col of columnsToAdd) {
            try {
                // Check if column exists first to avoid errors (simplified check by just trying to add)
                // In production, we'd query information_schema, but here we can just try-catch
                await sequelize.query(`ALTER TABLE orders ${col}`);
                console.log(`Added: ${col}`);
            } catch (error) {
                if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Skipped (already exists): ${col.split(' ')[2]}`);
                } else {
                    console.error(`Failed to add column: ${col}`, error.message);
                }
            }
        }

        console.log('Schema update complete.');

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

updateSchema();
