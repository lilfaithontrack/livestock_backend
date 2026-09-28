/**
 * Migration 011 — Seller documents (multi-file KYC)
 *
 * The legacy `users` table stored each KYC document type as a single URL
 * column (trade_license_url, tin_vat_url, national_id_front_url,
 * national_id_back_url). This migration introduces a dedicated
 * `seller_documents` table so each document type can hold more than one file.
 *
 * The legacy single-URL columns are kept for backward compatibility; new
 * uploads go to `seller_documents`.
 *
 * Run: `node migrations/run-011-kyc-documents-table.js`
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
        console.log('🚀 Starting seller_documents table migration...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS seller_documents (
                document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_name VARCHAR(255),
                mime_type VARCHAR(100),
                file_size BIGINT,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT seller_documents_document_type_chk
                    CHECK (document_type IN ('trade_license','tin_vat','national_id_front','national_id_back','other'))
            );
        `);
        console.log('✅ seller_documents table created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_seller_documents_user_id ON seller_documents(user_id);
            CREATE INDEX IF NOT EXISTS idx_seller_documents_user_type ON seller_documents(user_id, document_type);
        `);
        console.log('✅ Indexes created');

        // Backfill existing single-URL columns into the new table
        await sequelize.query(`
            INSERT INTO seller_documents (user_id, document_type, file_url)
            SELECT user_id, 'trade_license', trade_license_url
            FROM users WHERE trade_license_url IS NOT NULL AND trade_license_url <> ''
            ON CONFLICT DO NOTHING;
        `);
        await sequelize.query(`
            INSERT INTO seller_documents (user_id, document_type, file_url)
            SELECT user_id, 'tin_vat', tin_vat_url
            FROM users WHERE tin_vat_url IS NOT NULL AND tin_vat_url <> ''
            ON CONFLICT DO NOTHING;
        `);
        await sequelize.query(`
            INSERT INTO seller_documents (user_id, document_type, file_url)
            SELECT user_id, 'national_id_front', national_id_front_url
            FROM users WHERE national_id_front_url IS NOT NULL AND national_id_front_url <> ''
            ON CONFLICT DO NOTHING;
        `);
        await sequelize.query(`
            INSERT INTO seller_documents (user_id, document_type, file_url)
            SELECT user_id, 'national_id_back', national_id_back_url
            FROM users WHERE national_id_back_url IS NOT NULL AND national_id_back_url <> ''
            ON CONFLICT DO NOTHING;
        `);
        console.log('✅ Backfilled legacy single-URL KYC documents into seller_documents');

        console.log('🎉 Migration 011 complete');
    } catch (error) {
        console.error('❌ Migration 011 failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigration();
