/**
 * Migration 012 — Staff management
 *
 * Adds:
 *   - `staff_roles` table: defined roles (SuperAdmin, Manager, Moderator,
 *     Support, Finance) each with a JSONB `permissions` array.
 *   - `users.staff_role_id` FK so an Admin user can be assigned a staff role.
 *   - `users.permissions` JSONB for per-user overrides (optional).
 *   - Extends `users.role` ENUM with 'Staff' for non-admin staff accounts
 *     that still need panel access.
 *
 * Run: `node migrations/run-012-staff-management.js`
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
        console.log('🚀 Starting staff management migration...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS staff_roles (
                staff_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(80) NOT NULL UNIQUE,
                description TEXT,
                permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
                is_system BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ staff_roles table created');

        // Seed default roles + permission sets
        const defaults = [
            { name: 'SuperAdmin', description: 'Full access to every part of the admin panel', permissions: ['*'], is_system: true },
            { name: 'Manager',    description: 'Manage users, sellers, products, orders', permissions: ['users.view','users.edit','sellers.view','sellers.kyc','products.view','products.approve','products.delete','orders.view','orders.edit','rentals.view','rentals.approve'], is_system: true },
            { name: 'Moderator',  description: 'Review and moderate listings & reviews', permissions: ['products.view','products.approve','products.delete','reviews.view','reviews.delete','rentals.view','rentals.approve'], is_system: true },
            { name: 'Support',    description: 'View orders/users to assist customers', permissions: ['users.view','orders.view','orders.edit'], is_system: true },
            { name: 'Finance',    description: 'Manage payouts, earnings, plans', permissions: ['payouts.view','payouts.process','earnings.view','plans.view','plans.edit'], is_system: true },
        ];
        for (const r of defaults) {
            await sequelize.query(`
                INSERT INTO staff_roles (name, description, permissions, is_system)
                VALUES (:name, :description, :permissions::jsonb, :isSystem)
                ON CONFLICT (name) DO NOTHING;
            `, { replacements: { name: r.name, description: r.description, permissions: JSON.stringify(r.permissions), isSystem: r.isSystem } });
        }
        console.log('✅ Default staff roles seeded');

        // Add columns to users (idempotent)
        await sequelize.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS staff_role_id UUID REFERENCES staff_roles(staff_role_id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
        `);
        console.log('✅ users columns added (staff_role_id, permissions, is_active, last_login_at)');

        // Add 'Staff' to the role ENUM if it doesn't exist
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type t
                    JOIN pg_enum e ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_users_role' AND e.enumlabel = 'Staff'
                ) THEN
                    ALTER TYPE enum_users_role ADD VALUE 'Staff';
                END IF;
            END$$;
        `);
        console.log('✅ users.role enum extended with Staff');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_users_staff_role_id ON users(staff_role_id);
        `);

        console.log('🎉 Migration 012 complete');
    } catch (error) {
        console.error('❌ Migration 012 failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigration();
