/**
 * Migration 013 — Dynamic language / translations
 *
 * Adds:
 *   - `languages` table: enabled languages (en, am, ...) with display name,
 *     native name, direction (ltr/rtl), and is_active flag.
 *   - `translations` table: key -> { lang, value } pairs that the mobile and
 *     admin clients fetch at runtime. Keys are namespaced like 'home.title',
 *     'checkout.placeOrder', etc.
 *   - `users.preferred_language` column (default 'en').
 *
 * Run: `node migrations/run-013-languages.js`
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
        console.log('🚀 Starting languages & translations migration...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS languages (
                code VARCHAR(10) PRIMARY KEY,
                name VARCHAR(80) NOT NULL,
                native_name VARCHAR(80) NOT NULL,
                direction VARCHAR(3) NOT NULL DEFAULT 'ltr',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ languages table created');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS translations (
                translation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                language_code VARCHAR(10) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
                translation_key VARCHAR(200) NOT NULL,
                value TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (language_code, translation_key)
            );
        `);
        console.log('✅ translations table created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_translations_language_key
            ON translations(language_code, translation_key);
        `);

        // Seed default languages
        const langs = [
            { code: 'en', name: 'English',  native_name: 'English',  direction: 'ltr', is_default: true },
            { code: 'am', name: 'Amharic',  native_name: 'አማርኛ',    direction: 'ltr', is_default: false },
        ];
        for (const l of langs) {
            await sequelize.query(`
                INSERT INTO languages (code, name, native_name, direction, is_active, is_default)
                VALUES (:code, :name, :native, :dir, TRUE, :isDefault)
                ON CONFLICT (code) DO NOTHING;
            `, { replacements: { ...l } });
        }
        console.log('✅ Default languages seeded (en, am)');

        // Seed a small set of common keys for both languages so the system
        // is usable immediately. Apps can fetch and override these.
        const seed = [
            { key: 'common.save',           en: 'Save',           am: 'አስቀምጥ' },
            { key: 'common.cancel',         en: 'Cancel',         am: 'ይቅር' },
            { key: 'common.delete',         en: 'Delete',         am: 'ሰርዝ' },
            { key: 'common.edit',           en: 'Edit',           am: 'አስተካክል' },
            { key: 'common.search',         en: 'Search',         am: 'ፈልግ' },
            { key: 'common.loading',        en: 'Loading...',     am: 'በመጫን ላይ...' },
            { key: 'common.retry',          en: 'Retry',          am: 'እንደገና ይሞክሩ' },
            { key: 'common.back',           en: 'Back',           am: 'ተመለስ' },
            { key: 'home.title',            en: 'Home',           am: 'መነሻ' },
            { key: 'home.welcome',          en: 'Welcome',        am: 'እንኳን ደህና መጡ' },
            { key: 'cart.title',            en: 'Cart',           am: 'ግዢ ቅርጫ' },
            { key: 'cart.checkout',         en: 'Checkout',       am: 'ይክፈሉ' },
            { key: 'checkout.placeOrder',   en: 'Place Order',    am: 'ትዕዛዝ ይስጡ' },
            { key: 'checkout.total',        en: 'Total',          am: 'ድምር' },
            { key: 'profile.title',         en: 'Profile',        am: 'መገለጫ' },
            { key: 'profile.settings',      en: 'Settings',       am: 'ቅንብሮች' },
            { key: 'profile.language',      en: 'Language',       am: 'ቋንቋ' },
            { key: 'profile.logout',        en: 'Logout',         am: 'ውጣ' },
            { key: 'seller.inventory',      en: 'My Inventory',   am: 'የእኔ እቃዎች' },
            { key: 'seller.addProduct',     en: 'Add Product',    am: 'እቃ ያክሉ' },
            { key: 'seller.postQercha',     en: 'Post Qercha',    am: 'ቄርቻ ይለጥፉ' },
            { key: 'product.addToCart',     en: 'Add to Cart',    am: 'ወደ ቅርጫ ያክሉ' },
            { key: 'product.buyNow',        en: 'Buy Now',        am: 'አሁን ይግዙ' },
            { key: 'product.sharePrice',    en: 'Price per share',am: 'የአንድ ድርሻ ዋጋ' },
            { key: 'qercha.joinNow',        en: 'Join Now',       am: 'አሁን ይቀላቀሉ' },
            { key: 'qercha.shares',         en: 'shares',         am: 'ድርሻዎች' },
            { key: 'auth.login',            en: 'Login',          am: 'ግባ' },
            { key: 'auth.register',         en: 'Register',       am: 'ይመዝገቡ' },
            { key: 'auth.phone',            en: 'Phone',          am: 'ስልክ' },
            { key: 'auth.otp',              en: 'OTP Code',       am: 'OTP ኮድ' },
        ];
        for (const s of seed) {
            await sequelize.query(`
                INSERT INTO translations (language_code, translation_key, value)
                VALUES ('en', :key, :en)
                ON CONFLICT (language_code, translation_key) DO NOTHING;
            `, { replacements: { key: s.key, en: s.en } });
            await sequelize.query(`
                INSERT INTO translations (language_code, translation_key, value)
                VALUES ('am', :key, :am)
                ON CONFLICT (language_code, translation_key) DO NOTHING;
            `, { replacements: { key: s.key, am: s.am } });
        }
        console.log(`✅ Seeded ${seed.length} translation keys in en + am`);

        // Add preferred_language column to users
        await sequelize.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';
        `);
        console.log('✅ users.preferred_language column added');

        console.log('🎉 Migration 013 complete');
    } catch (error) {
        console.error('❌ Migration 013 failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigration();
