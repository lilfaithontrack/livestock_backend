/**
 * SAFE PRODUCT METADATA MIGRATION + SUBCATEGORY SCHEMA SEEDING
 * ─────────────────────────────────────────────────────────────
 * Run: node scripts/migrate_product_metadata.js
 *
 * What this does (ALL steps are safe — no data is deleted):
 *  1. Backs up current product metadata values to a JSON file before changing anything
 *  2. Copies legacy livestock-specific column data into products.metadata JSON
 *     (the old columns are NOT dropped — data is kept in both places)
 *  3. Seeds metadata_schema on every subcategory that doesn't have one yet,
 *     based on category/subcategory name patterns (livestock, flowers, etc.)
 *  4. Prints a full summary of what was done
 *
 * SAFE TO RE-RUN: uses "only if missing" logic everywhere.
 */

require('dotenv').config();
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// ─── Field schema library ────────────────────────────────────────────────────

const LIVESTOCK_SCHEMA = [
    { key: 'breed',            label: 'Breed',             type: 'text',     placeholder: 'e.g. Boran, Horro, Harar',  group: 'Animal Info' },
    { key: 'gender',           label: 'Gender',            type: 'select',   options: [{ value: 'male', label: '♂ Male' }, { value: 'female', label: '♀ Female' }], group: 'Animal Info' },
    { key: 'age_months',       label: 'Age (months)',      type: 'number',   placeholder: '0', group: 'Animal Info' },
    { key: 'date_of_birth',    label: 'Date of Birth',     type: 'date',     group: 'Animal Info' },
    { key: 'weight_kg',        label: 'Weight',            type: 'number',   placeholder: '0', suffix: 'kg', group: 'Animal Info' },
    { key: 'height_cm',        label: 'Height',            type: 'number',   placeholder: '0', suffix: 'cm', group: 'Animal Info' },
    { key: 'color_markings',   label: 'Color & Markings',  type: 'text',     placeholder: 'Describe color/markings', group: 'Animal Info' },
    { key: 'health_status',    label: 'Health Status',     type: 'select',   options: [{ value: 'excellent', label: '💚 Excellent' }, { value: 'good', label: '💙 Good' }, { value: 'fair', label: '💛 Fair' }, { value: 'poor', label: '❤️ Poor' }, { value: 'unknown', label: '⚪ Unknown' }], group: 'Health' },
    { key: 'medical_history',  label: 'Medical History',   type: 'textarea', placeholder: 'Medical notes...', group: 'Health' },
    { key: 'last_health_checkup', label: 'Last Health Checkup', type: 'date', group: 'Health' },
    { key: 'vaccination_records', label: 'Vaccination Records', type: 'textarea', placeholder: 'List vaccinations...', group: 'Health' },
    { key: 'genetic_traits',   label: 'Genetic Traits',    type: 'textarea', placeholder: 'Genetic notes...', group: 'Performance' },
    { key: 'milk_production_liters_per_day', label: 'Milk Production', type: 'number', placeholder: '0', suffix: 'L/day', group: 'Performance' },
    { key: 'breeding_history', label: 'Breeding History',  type: 'textarea', placeholder: 'Breeding notes...', group: 'Performance' },
    { key: 'offspring_count',  label: 'Offspring Count',   type: 'number',   placeholder: '0', group: 'Performance' },
];

const CHICKEN_SCHEMA = [
    { key: 'breed',          label: 'Breed / Type',     type: 'text',   placeholder: 'e.g. Broiler, Layer, Habesha', group: 'Animal Info' },
    { key: 'gender',         label: 'Gender',           type: 'select', options: [{ value: 'male', label: '♂ Male (Cock)' }, { value: 'female', label: '♀ Female (Hen)' }, { value: 'mixed', label: 'Mixed' }], group: 'Animal Info' },
    { key: 'age_months',     label: 'Age (months)',     type: 'number', placeholder: '0', group: 'Animal Info' },
    { key: 'weight_kg',      label: 'Weight',           type: 'number', placeholder: '0', suffix: 'kg', group: 'Animal Info' },
    { key: 'health_status',  label: 'Health Status',    type: 'select', options: [{ value: 'excellent', label: '💚 Excellent' }, { value: 'good', label: '💙 Good' }, { value: 'fair', label: '💛 Fair' }, { value: 'poor', label: '❤️ Poor' }], group: 'Health' },
    { key: 'vaccination_records', label: 'Vaccinations', type: 'textarea', placeholder: 'e.g. Newcastle, Gumboro...', group: 'Health' },
    { key: 'feeding_type',   label: 'Feeding Type',     type: 'select', options: [{ value: 'grain', label: 'Grain-fed' }, { value: 'free_range', label: 'Free-range' }, { value: 'commercial_feed', label: 'Commercial Feed' }], group: 'Details' },
];

const FLOWER_BOUQUET_SCHEMA = [
    { key: 'flower_types',    label: 'Flower Types',      type: 'text',     placeholder: 'e.g. Rose, Lily, Sunflower', group: 'Bouquet Info', required: true },
    { key: 'colors',          label: 'Colors',            type: 'text',     placeholder: 'e.g. Red, White, Mixed', group: 'Bouquet Info' },
    { key: 'size',            label: 'Bouquet Size',      type: 'select',   options: [{ value: 'small', label: 'Small (5-7 stems)' }, { value: 'medium', label: 'Medium (10-15 stems)' }, { value: 'large', label: 'Large (20+ stems)' }, { value: 'custom', label: 'Custom' }], group: 'Bouquet Info' },
    { key: 'stem_count',      label: 'Stem Count',        type: 'number',   placeholder: '0', group: 'Bouquet Info' },
    { key: 'occasion',        label: 'Occasion',          type: 'select',   options: [{ value: 'wedding', label: 'Wedding' }, { value: 'birthday', label: 'Birthday' }, { value: 'anniversary', label: 'Anniversary' }, { value: 'funeral', label: 'Funeral' }, { value: 'general', label: 'General Gift' }], group: 'Bouquet Info' },
    { key: 'freshness_days',  label: 'Freshness (days)',  type: 'number',   placeholder: '0', suffix: 'days', group: 'Details' },
    { key: 'includes_packaging', label: 'Includes Gift Packaging', type: 'checkbox', group: 'Details' },
    { key: 'customizable',    label: 'Customizable',      type: 'checkbox', group: 'Details' },
    { key: 'delivery_note',   label: 'Delivery Note',     type: 'textarea', placeholder: 'Any special delivery/handling notes...', group: 'Details' },
];

const PLANT_SCHEMA = [
    { key: 'plant_species',   label: 'Plant Species',     type: 'text',     placeholder: 'e.g. Aloe vera, Ficus', group: 'Plant Info', required: true },
    { key: 'plant_type',      label: 'Plant Type',        type: 'select',   options: [{ value: 'indoor', label: 'Indoor' }, { value: 'outdoor', label: 'Outdoor' }, { value: 'medicinal', label: 'Medicinal' }, { value: 'edible', label: 'Edible' }, { value: 'ornamental', label: 'Ornamental' }], group: 'Plant Info' },
    { key: 'pot_size',        label: 'Pot Size',          type: 'select',   options: [{ value: 'small', label: 'Small (< 15cm)' }, { value: 'medium', label: 'Medium (15-30cm)' }, { value: 'large', label: 'Large (> 30cm)' }, { value: 'no_pot', label: 'No pot (bare root)' }], group: 'Plant Info' },
    { key: 'height_cm',       label: 'Plant Height',      type: 'number',   placeholder: '0', suffix: 'cm', group: 'Plant Info' },
    { key: 'sunlight',        label: 'Sunlight Needs',    type: 'select',   options: [{ value: 'full_sun', label: 'Full Sun' }, { value: 'partial', label: 'Partial Shade' }, { value: 'shade', label: 'Full Shade' }], group: 'Care' },
    { key: 'watering',        label: 'Watering Frequency', type: 'select',  options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'monthly', label: 'Monthly' }], group: 'Care' },
    { key: 'care_instructions', label: 'Care Instructions', type: 'textarea', placeholder: 'How to care for this plant...', group: 'Care' },
    { key: 'medicinal_use',   label: 'Medicinal / Edible Use', type: 'textarea', placeholder: 'Traditional or culinary uses...', group: 'Details' },
];

const GARDEN_DECOR_SCHEMA = [
    { key: 'material',        label: 'Material',          type: 'text',     placeholder: 'e.g. Terracotta, Plastic, Ceramic', group: 'Product Info', required: true },
    { key: 'size',            label: 'Size',              type: 'text',     placeholder: 'e.g. 20cm x 15cm', group: 'Product Info' },
    { key: 'color',           label: 'Color',             type: 'text',     placeholder: 'e.g. Brown, White, Natural', group: 'Product Info' },
    { key: 'drainage_holes',  label: 'Drainage Holes',    type: 'checkbox', group: 'Details' },
    { key: 'weather_resistant', label: 'Weather Resistant', type: 'checkbox', group: 'Details' },
    { key: 'style',           label: 'Style',             type: 'select',   options: [{ value: 'modern', label: 'Modern' }, { value: 'traditional', label: 'Traditional' }, { value: 'rustic', label: 'Rustic' }, { value: 'minimalist', label: 'Minimalist' }], group: 'Details' },
];

const ELECTRONICS_SCHEMA = [
    { key: 'brand',           label: 'Brand',             type: 'text',     placeholder: 'e.g. Samsung, Apple', group: 'Specifications', required: true },
    { key: 'model_number',    label: 'Model Number',      type: 'text',     placeholder: 'e.g. iPhone 15 Pro', group: 'Specifications' },
    { key: 'processor',       label: 'Processor',         type: 'text',     placeholder: 'e.g. Snapdragon 8 Gen 3', group: 'Specifications' },
    { key: 'ram',             label: 'RAM',               type: 'text',     placeholder: 'e.g. 8GB', group: 'Specifications' },
    { key: 'storage',         label: 'Storage',           type: 'text',     placeholder: 'e.g. 256GB', group: 'Specifications' },
    { key: 'screen_size',     label: 'Screen Size',       type: 'text',     placeholder: 'e.g. 6.7 inches', group: 'Specifications' },
    { key: 'battery_capacity', label: 'Battery',          type: 'text',     placeholder: 'e.g. 5000mAh', group: 'Specifications' },
    { key: 'operating_system', label: 'Operating System', type: 'text',     placeholder: 'e.g. Android 14, iOS 17', group: 'Specifications' },
    { key: 'condition',       label: 'Condition',         type: 'select',   options: [{ value: 'new', label: 'Brand New' }, { value: 'like_new', label: 'Like New' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }], group: 'Details' },
    { key: 'warranty',        label: 'Warranty',          type: 'text',     placeholder: 'e.g. 1 year manufacturer', group: 'Details' },
    { key: 'imei',            label: 'IMEI (optional)',   type: 'text',     placeholder: 'For phones only', group: 'Details' },
];

const FEED_SCHEMA = [
    { key: 'feed_type',       label: 'Feed Type',         type: 'text',     placeholder: 'e.g. Hay, Grain, Pellets', group: 'Feed Info', required: true },
    { key: 'animal_type',     label: 'For Animal',        type: 'select',   options: [{ value: 'cattle', label: 'Cattle' }, { value: 'sheep', label: 'Sheep/Goat' }, { value: 'chicken', label: 'Chicken/Poultry' }, { value: 'horse', label: 'Horse' }, { value: 'general', label: 'General' }], group: 'Feed Info' },
    { key: 'weight_kg',       label: 'Package Weight',    type: 'number',   placeholder: '0', suffix: 'kg', group: 'Feed Info' },
    { key: 'ingredients',     label: 'Ingredients',       type: 'textarea', placeholder: 'List main ingredients...', group: 'Nutrition' },
    { key: 'protein_percent', label: 'Protein Content',   type: 'number',   placeholder: '0', suffix: '%', group: 'Nutrition' },
    { key: 'organic_certified', label: 'Certified Organic', type: 'checkbox', group: 'Quality' },
    { key: 'storage_instructions', label: 'Storage Instructions', type: 'textarea', placeholder: 'How to store...', group: 'Quality' },
];

// ─── Schema matcher: assign schema based on subcategory/category name ────────

function pickSchema(subcatName, catName) {
    const name = (subcatName + ' ' + (catName || '')).toLowerCase();

    if (name.includes('mobile') || name.includes('phone') || name.includes('laptop') ||
        name.includes('electronic') || name.includes('computer') || name.includes('tablet')) {
        return ELECTRONICS_SCHEMA;
    }
    if (name.includes('chicken') || name.includes('poultry') || name.includes('ዶሮ')) {
        return CHICKEN_SCHEMA;
    }
    if (name.includes('feed') || name.includes('መኖ') || name.includes('hay') || name.includes('grain')) {
        return FEED_SCHEMA;
    }
    if (name.includes('bouquet') || name.includes('አበቦች') || name.includes('አበባ') ||
        name.includes('flower') || name.includes('floral')) {
        return FLOWER_BOUQUET_SCHEMA;
    }
    if (name.includes('plant') || name.includes('ተክ') || name.includes('garden decor') ||
        name.includes('ማሰሮ') || name.includes('pot') || name.includes('decore')) {
        return GARDEN_DECOR_SCHEMA;
    }
    // Default: all livestock (cattle, sheep, goat, etc.)
    return LIVESTOCK_SCHEMA;
}

// ─── Main migration ──────────────────────────────────────────────────────────

async function migrate() {
    let backupPath = null;
    try {
        await sequelize.authenticate();
        console.log('✅  Connected to:', process.env.DB_NAME);
        console.log('═'.repeat(70));

        // ── STEP 1: Backup current product metadata to JSON ──────────────────
        const allProducts = await sequelize.query(
            `SELECT product_id, name, status, sub_cat_id,
                    breed, age_months, date_of_birth, gender, weight_kg, height_cm,
                    color_markings, health_status, vaccination_records, medical_history,
                    veterinary_certificates, last_health_checkup, genetic_traits,
                    milk_production_liters_per_day, breeding_history, offspring_count,
                    metadata
             FROM products`,
            { type: QueryTypes.SELECT }
        );

        backupPath = path.join(__dirname, `backup_products_before_migration_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(allProducts, null, 2), 'utf8');
        console.log(`\n💾  Backup saved → ${backupPath}`);
        console.log(`   ${allProducts.length} products backed up.`);

        // ── STEP 2: Migrate livestock column data → metadata JSON ────────────
        console.log('\n🔄  Migrating product data into metadata JSON column...');
        let migrated = 0;
        let skipped = 0;

        for (const p of allProducts) {
            // Build metadata from legacy columns
            const legacyData = {};
            const fields = [
                'breed', 'age_months', 'date_of_birth', 'gender', 'weight_kg', 'height_cm',
                'color_markings', 'health_status', 'vaccination_records', 'medical_history',
                'veterinary_certificates', 'last_health_checkup', 'genetic_traits',
                'milk_production_liters_per_day', 'breeding_history', 'offspring_count'
            ];

            for (const f of fields) {
                if (p[f] !== null && p[f] !== undefined && p[f] !== '') {
                    legacyData[f] = p[f];
                }
            }

            if (Object.keys(legacyData).length === 0) {
                skipped++;
                continue;
            }

            // Merge with existing metadata (don't overwrite existing keys)
            let existing = {};
            if (p.metadata) {
                try {
                    existing = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
                } catch (_) {}
            }

            const merged = { ...legacyData, ...existing }; // existing keys win (don't overwrite)

            await sequelize.query(
                `UPDATE products SET metadata = :meta WHERE product_id = :id`,
                {
                    replacements: {
                        meta: JSON.stringify(merged),
                        id: p.product_id
                    },
                    type: QueryTypes.UPDATE
                }
            );
            migrated++;
            console.log(`   ✅  "${p.name}" — merged ${Object.keys(legacyData).length} fields into metadata`);
        }

        console.log(`\n   Done: ${migrated} products migrated, ${skipped} skipped (no legacy data).`);

        // ── STEP 3: Seed metadata_schema for subcategories without one ───────
        console.log('\n🏷️   Seeding metadata_schema on subcategories...');

        const subcats = await sequelize.query(
            `SELECT s.sub_cat_id, s.name, s.slug, s.metadata_schema,
                    c.name AS cat_name
             FROM product_subcategories s
             LEFT JOIN product_categories c ON c.cat_id = s.cat_id`,
            { type: QueryTypes.SELECT }
        );

        let seeded = 0;
        let alreadyHad = 0;

        for (const s of subcats) {
            let existingSchema = s.metadata_schema;
            if (typeof existingSchema === 'string') {
                try { existingSchema = JSON.parse(existingSchema); } catch (_) { existingSchema = null; }
            }

            if (Array.isArray(existingSchema) && existingSchema.length > 0) {
                alreadyHad++;
                console.log(`   ⏭️   "${s.name}" — already has ${existingSchema.length} fields, skipping`);
                continue;
            }

            const schema = pickSchema(s.name, s.cat_name);
            await sequelize.query(
                `UPDATE product_subcategories SET metadata_schema = :schema WHERE sub_cat_id = :id`,
                {
                    replacements: {
                        schema: JSON.stringify(schema),
                        id: s.sub_cat_id
                    },
                    type: QueryTypes.UPDATE
                }
            );
            seeded++;
            console.log(`   ✅  "${s.name}" [${s.cat_name}] — seeded ${schema.length} fields`);
        }

        console.log(`\n   Done: ${seeded} subcategories seeded, ${alreadyHad} already had schemas.`);

        // ── STEP 4: Verification ─────────────────────────────────────────────
        console.log('\n🔍  Verification...');

        const verifyProducts = await sequelize.query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN metadata IS NOT NULL AND metadata != '{}' AND metadata != 'null' THEN 1 ELSE 0 END) AS with_metadata
             FROM products`,
            { type: QueryTypes.SELECT }
        );
        const vp = verifyProducts[0];
        console.log(`   Products with metadata: ${vp.with_metadata} / ${vp.total}`);

        const verifySubcats = await sequelize.query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN metadata_schema IS NOT NULL THEN 1 ELSE 0 END) AS with_schema
             FROM product_subcategories`,
            { type: QueryTypes.SELECT }
        );
        const vs = verifySubcats[0];
        console.log(`   Subcategories with schema: ${vs.with_schema} / ${vs.total}`);

        console.log('\n' + '═'.repeat(70));
        console.log('✅  Migration complete. Legacy columns were NOT dropped — data is safe.');
        console.log(`💾  Full backup at: ${backupPath}`);
        console.log('\n⚠️   NOTE: Legacy product columns (breed, age_months, etc.) still exist.');
        console.log('   You can drop them later with the SQL in migrations/001_make_products_generic.sql');
        console.log('   Only do so after confirming metadata JSON has all the data you need.');

    } catch (err) {
        console.error('\n❌  Migration failed:', err.message);
        console.error(err.stack);
        if (backupPath) {
            console.error(`\n💾  Backup was saved at: ${backupPath} — your data is safe.`);
        }
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
