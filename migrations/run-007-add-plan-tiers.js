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
        console.log('Running migration 007: Add Plan Tiers...\n');

        // Check if plan_name column already exists
        console.log('Checking if plan_name column exists...');
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'seller_plans' 
            AND COLUMN_NAME = 'plan_name'
        `, [process.env.DB_NAME || 'ethio_livestock_db']);

        if (columns.length === 0) {
            console.log('Adding plan_name column to seller_plans table...');
            await connection.query(`
                ALTER TABLE seller_plans 
                ADD COLUMN plan_name VARCHAR(50) NULL COMMENT 'Plan tier name: Basic, Gold, Premium, or custom name'
                AFTER plan_type
            `);
            console.log('✓ plan_name column added');
        } else {
            console.log('✓ plan_name column already exists');
        }

        console.log('\n✅ Migration completed successfully!');

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

runMigration();
