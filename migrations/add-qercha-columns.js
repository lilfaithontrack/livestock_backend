/**
 * Migration: Add missing columns to qercha_packages table
 * Run with: node migrations/add-qercha-columns.js
 */
require('dotenv').config();
const sequelize = require('../config/database');

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connected');

        // Check which columns already exist
        const [columns] = await sequelize.query(
            `SHOW COLUMNS FROM qercha_packages`
        );
        const existingCols = columns.map(c => c.Field);
        console.log('Existing columns:', existingCols.join(', '));

        // Add category column if missing
        if (!existingCols.includes('category')) {
            await sequelize.query(
                `ALTER TABLE qercha_packages ADD COLUMN category VARCHAR(100) NULL COMMENT 'Qercha-specific category (e.g. Cattle, Sheep, Goat, Camel)'`
            );
            console.log('✓ Added column: category');
        } else {
            console.log('- Column category already exists');
        }

        // Add start_date column if missing
        if (!existingCols.includes('start_date')) {
            await sequelize.query(
                `ALTER TABLE qercha_packages ADD COLUMN start_date DATETIME NULL COMMENT 'When the package becomes available for participation'`
            );
            console.log('✓ Added column: start_date');
        } else {
            console.log('- Column start_date already exists');
        }

        // Add expiry_date column if missing
        if (!existingCols.includes('expiry_date')) {
            await sequelize.query(
                `ALTER TABLE qercha_packages ADD COLUMN expiry_date DATETIME NULL COMMENT 'When the package expires if not completed'`
            );
            console.log('✓ Added column: expiry_date');
        } else {
            console.log('- Column expiry_date already exists');
        }

        console.log('\n✓ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        process.exit(1);
    }
};

run();
