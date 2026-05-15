const { sequelize } = require('../models');

async function addColumnIfMissing(table, column, definition) {
    try {
        await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`  ✅  Added ${table}.${column}`);
    } catch (err) {
        if (err.original?.code === 'ER_DUP_FIELDNAME') {
            console.log(`  ℹ️  ${table}.${column} already exists`);
        } else {
            console.error(`  ❌  Failed ${table}.${column}: ${err.message}`);
        }
    }
}

async function createTableIfMissing(name, ddl) {
    try {
        await sequelize.query(ddl);
        console.log(`  ✅  Created table ${name}`);
    } catch (err) {
        if (err.original?.errno === 1050) {
            console.log(`  ℹ️  Table ${name} already exists`);
        } else {
            console.error(`  ❌  Failed to create ${name}: ${err.message}`);
        }
    }
}

async function run() {
    console.log('\n🔧  Fixing missing columns & tables...\n');

    // ── qercha_packages ──────────────────────────────────────────────────────
    console.log('📦  qercha_packages:');
    await addColumnIfMissing('qercha_packages', 'ethiopian_start_display',
        "VARCHAR(120) NULL COMMENT 'Optional Ethiopian calendar label for start'");
    await addColumnIfMissing('qercha_packages', 'ethiopian_expiry_display',
        "VARCHAR(120) NULL COMMENT 'Optional Ethiopian calendar label for closing'");
    await addColumnIfMissing('qercha_packages', 'time_window_note',
        "VARCHAR(255) NULL COMMENT 'Human-readable schedule note'");

    // ── product_reviews table ─────────────────────────────────────────────────
    console.log('\n📋  product_reviews:');
    await createTableIfMissing('product_reviews', `
        CREATE TABLE IF NOT EXISTS product_reviews (
            review_id     CHAR(36)     NOT NULL PRIMARY KEY,
            product_id    CHAR(36)     NOT NULL,
            seller_id     CHAR(36)     NOT NULL,
            buyer_id      CHAR(36)     NOT NULL,
            order_id      CHAR(36)     NOT NULL,
            rating        TINYINT      NOT NULL,
            comment       TEXT         NULL,
            created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_pr_product (product_id),
            INDEX idx_pr_seller  (seller_id),
            INDEX idx_pr_buyer   (buyer_id),
            INDEX idx_pr_order   (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('\n✅  Done. Re-run check_missing_columns.js to verify.\n');
    await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
