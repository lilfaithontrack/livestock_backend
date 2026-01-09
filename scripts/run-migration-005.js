require('dotenv').config();
const sequelize = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✓ Database connection established');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, '../migrations/005_add_shipping_address_to_orders.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolons and filter out empty/comment-only statements
        // Remove comments first
        const cleanedSQL = migrationSQL
            .split('\n')
            .map(line => {
                // Remove full-line comments
                if (line.trim().startsWith('--')) return '';
                // Remove inline comments (but keep the SQL part)
                const commentIndex = line.indexOf('--');
                return commentIndex >= 0 ? line.substring(0, commentIndex).trim() : line;
            })
            .join('\n');

        // Split by semicolons
        const statements = cleanedSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s && s.length > 0 && s.toUpperCase().includes('ALTER TABLE'));

        console.log(`\nRunning migration: 005_add_shipping_address_to_orders.sql`);
        console.log(`Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';'; // Add semicolon back
            if (statement) {
                try {
                    console.log(`Executing statement ${i + 1}/${statements.length}...`);
                    await sequelize.query(statement);
                    console.log(`✓ Statement ${i + 1} executed successfully`);
                } catch (error) {
                    // Check if column already exists (error 1060)
                    if (error.original && (error.original.code === 'ER_DUP_FIELDNAME' || error.original.errno === 1060)) {
                        console.log(`⚠ Column already exists, skipping...`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log('\n✓ Migration completed successfully!');
        console.log('Added shipping address fields to orders table:');
        console.log('  - shipping_address');
        console.log('  - shipping_full_name');
        console.log('  - shipping_phone');
        console.log('  - shipping_city');
        console.log('  - shipping_region');
        console.log('  - shipping_notes');

        process.exit(0);
    } catch (error) {
        console.error('\n✗ Migration failed:');
        console.error(error.message);
        if (error.original) {
            console.error('Original error:', error.original.message);
        }
        process.exit(1);
    }
}

runMigration();

