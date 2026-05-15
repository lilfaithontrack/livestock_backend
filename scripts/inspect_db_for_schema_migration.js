/**
 * SAFE DATABASE INSPECTION SCRIPT
 * Run: node scripts/inspect_db_for_schema_migration.js
 *
 * Does NOT modify any data. Only reads and reports:
 *  1. Whether metadata_schema column exists on product_subcategories
 *  2. Current subcategories and their metadata_schema values
 *  3. Products and their metadata JSON content
 *  4. Products that have livestock-specific columns still populated
 *  5. Products whose metadata is missing sub-cat-specific fields
 */

require('dotenv').config();
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('✅  Connected to MySQL database:', process.env.DB_NAME);
        console.log('═'.repeat(70));

        // ── 1. Verify metadata_schema column exists ──────────────────────────
        const cols = await sequelize.query(
            `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'product_subcategories'
             ORDER BY ORDINAL_POSITION`,
            { replacements: { db: process.env.DB_NAME }, type: QueryTypes.SELECT }
        );
        console.log('\n📋  product_subcategories columns:');
        cols.forEach(c =>
            console.log(`   ${c.COLUMN_NAME.padEnd(28)} ${c.COLUMN_TYPE.padEnd(20)} nullable=${c.IS_NULLABLE}`)
        );

        const hasSchema = cols.some(c => c.COLUMN_NAME === 'metadata_schema');
        console.log(`\n   metadata_schema column present: ${hasSchema ? '✅ YES' : '❌ NO — migration needed'}`);

        // ── 2. Current subcategories + their schema status ────────────────────
        const subcats = await sequelize.query(
            `SELECT s.sub_cat_id, s.name, s.slug, s.metadata_schema,
                    c.name AS category_name
             FROM product_subcategories s
             LEFT JOIN product_categories c ON c.cat_id = s.cat_id
             ORDER BY c.name, s.name`,
            { type: QueryTypes.SELECT }
        );
        console.log(`\n📂  Subcategories (${subcats.length} total):`);
        subcats.forEach(s => {
            let schema = s.metadata_schema;
            if (typeof schema === 'string') {
                try { schema = JSON.parse(schema); } catch (_) { schema = null; }
            }
            const fieldCount = Array.isArray(schema) ? schema.length : 0;
            const badge = fieldCount > 0 ? `✅ ${fieldCount} fields` : '⚠️  no schema';
            console.log(`   [${s.category_name || '—'}] ${s.name.padEnd(30)} ${badge}`);
        });

        // ── 3. Products table — check livestock-specific columns exist ─────────
        const prodCols = await sequelize.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'products'
             ORDER BY ORDINAL_POSITION`,
            { replacements: { db: process.env.DB_NAME }, type: QueryTypes.SELECT }
        );
        const prodColNames = prodCols.map(c => c.COLUMN_NAME);
        const livestockCols = ['breed', 'age_months', 'date_of_birth', 'gender',
            'weight_kg', 'height_cm', 'color_markings', 'health_status',
            'vaccination_records', 'medical_history', 'veterinary_certificates',
            'last_health_checkup', 'genetic_traits', 'milk_production_liters_per_day',
            'breeding_history', 'offspring_count'];

        const existingLivestockCols = livestockCols.filter(c => prodColNames.includes(c));
        const missingLivestockCols  = livestockCols.filter(c => !prodColNames.includes(c));

        console.log(`\n🐄  Legacy livestock columns on products table:`);
        console.log(`   Still present (${existingLivestockCols.length}): ${existingLivestockCols.join(', ') || 'none'}`);
        console.log(`   Already removed (${missingLivestockCols.length}): ${missingLivestockCols.join(', ') || 'none'}`);

        // ── 4. Product counts & metadata population status ────────────────────
        const productStats = await sequelize.query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN metadata IS NOT NULL AND metadata != '{}' AND metadata != 'null' THEN 1 ELSE 0 END) AS has_metadata,
                    SUM(CASE WHEN status = 'Live' THEN 1 ELSE 0 END) AS live_count,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_count
             FROM products`,
            { type: QueryTypes.SELECT }
        );
        const ps = productStats[0];
        console.log(`\n📦  Products summary:`);
        console.log(`   Total: ${ps.total} | Live: ${ps.live_count} | Pending: ${ps.pending_count}`);
        console.log(`   Has metadata JSON: ${ps.has_metadata} / ${ps.total}`);

        // ── 5. Products with livestock col data NOT yet in metadata ───────────
        if (existingLivestockCols.length > 0) {
            const check = existingLivestockCols.slice(0, 4).join(' IS NOT NULL OR ') + ' IS NOT NULL';
            const unmigratedRows = await sequelize.query(
                `SELECT product_id, name, status,
                        breed, age_months, gender, health_status,
                        metadata
                 FROM products
                 WHERE ${check}
                 LIMIT 10`,
                { type: QueryTypes.SELECT }
            );
            console.log(`\n⚠️   Products with legacy livestock column data (sample, up to 10):`);
            if (unmigratedRows.length === 0) {
                console.log('   None — all livestock columns are NULL ✅');
            } else {
                unmigratedRows.forEach(p => {
                    let meta = p.metadata;
                    if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch(_) {} }
                    const inMeta = meta && (meta.breed || meta.age_months || meta.gender);
                    console.log(`   ${p.product_id} | "${p.name}" | ${p.status}`);
                    console.log(`      breed=${p.breed}, age=${p.age_months}, gender=${p.gender}, health=${p.health_status}`);
                    console.log(`      data_in_metadata: ${inMeta ? '✅ yes' : '❌ NOT YET migrated'}`);
                });
            }
        }

        // ── 6. Per-subcategory product count ─────────────────────────────────
        const subCatCounts = await sequelize.query(
            `SELECT s.name AS subcat, c.name AS cat, COUNT(p.product_id) AS product_count
             FROM product_subcategories s
             LEFT JOIN product_categories c ON c.cat_id = s.cat_id
             LEFT JOIN products p ON p.sub_cat_id = s.sub_cat_id
             GROUP BY s.sub_cat_id
             ORDER BY product_count DESC`,
            { type: QueryTypes.SELECT }
        );
        console.log(`\n📊  Products per subcategory:`);
        subCatCounts.forEach(r =>
            console.log(`   [${r.cat || '—'}] ${r.subcat.padEnd(30)} ${r.product_count} product(s)`)
        );

        console.log('\n' + '═'.repeat(70));
        console.log('✅  Inspection complete. No data was modified.');
        console.log('\nNext step: run  node scripts/migrate_product_metadata.js  to safely migrate.');

    } catch (err) {
        console.error('❌  Error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

inspect();
