/**
 * Migration 010 — Add full_name + structured address columns to users
 *
 * Root cause fix for the address/name corruption bug:
 *   - The `address` column was being used to store the user's display name
 *     during email-OTP registration (authController.verifyEmailOTP wrote
 *     `address: name || null`).
 *   - Checkout then re-encoded `${fullName}, ${address}, ${city}, ${region}`
 *     back into `address` on every order, so the field kept growing/corrupting.
 *
 * This migration:
 *   1. Adds `full_name`, `city`, `region` columns.
 *   2. Backfills `full_name` from the first comma-segment of legacy `address`
 *      values that look like a name (short, single segment or name-prefixed).
 *   3. Cleans name-only values out of `address`.
 *
 * Run: `node migrations/run-010-user-full-name.js`
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function runMigration() {
    try {
        console.log('🚀 Starting user full_name + structured address migration...');

        // 1. Add columns if they don't exist
        const cols = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('full_name','city','region');
        `, { type: Sequelize.QueryTypes.SELECT });
        const existing = cols.map(c => c.column_name);

        if (!existing.includes('full_name')) {
            await sequelize.query(`ALTER TABLE users ADD COLUMN full_name VARCHAR(150);`);
            console.log('✅ Added users.full_name');
        } else {
            console.log('ℹ️  users.full_name already exists');
        }

        if (!existing.includes('city')) {
            await sequelize.query(`ALTER TABLE users ADD COLUMN city VARCHAR(100);`);
            console.log('✅ Added users.city');
        } else {
            console.log('ℹ️  users.city already exists');
        }

        if (!existing.includes('region')) {
            await sequelize.query(`ALTER TABLE users ADD COLUMN region VARCHAR(100);`);
            console.log('✅ Added users.region');
        } else {
            console.log('ℹ️  users.region already exists');
        }

        // 2. Backfill full_name from legacy address values that look like a name.
        //    A "name-like" legacy value is one where the first comma segment is
        //    short (<= 60 chars) and contains letters — i.e. the registration
        //    name prefix. Genuine addresses with no comma are left alone.
        await sequelize.query(`
            UPDATE users
            SET full_name = trim(split_part(address, ',', 1))
            WHERE full_name IS NULL
              AND address IS NOT NULL
              AND address <> ''
              AND address LIKE '%,%'
              AND length(trim(split_part(address, ',', 1))) BETWEEN 2 AND 60;
        `);
        console.log('✅ Backfilled full_name from name-prefixed address values');

        // 3. If the entire address was just a name (no comma) and full_name is
        //    still null, treat the whole address as the name and clear it.
        await sequelize.query(`
            UPDATE users
            SET full_name = trim(address),
                address = NULL
            WHERE full_name IS NULL
              AND address IS NOT NULL
              AND address <> ''
              AND address NOT LIKE '%,%'
              AND length(trim(address)) BETWEEN 2 AND 60
              AND address !~ '[0-9]';
        `);
        console.log('✅ Moved name-only address values into full_name');

        // 4. Strip the leading name segment from address values that had a
        //    name prefix (so address becomes the pure address remainder).
        await sequelize.query(`
            UPDATE users
            SET address = nullif(trim(regexp_replace(address, '^[^,]+,\\s*', '')), '')
            WHERE full_name IS NOT NULL
              AND address LIKE '%,%'
              AND length(trim(split_part(address, ',', 1))) BETWEEN 2 AND 60;
        `);
        console.log('✅ Stripped name prefix from address values');

        console.log('🎉 Migration 010 complete');
    } catch (error) {
        console.error('❌ Migration 010 failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigration();
