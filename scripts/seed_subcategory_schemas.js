/**
 * seed_subcategory_schemas.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds / replaces metadata_schema on all product_subcategories based on
 * their parent category name.
 *
 * Run:  node scripts/seed_subcategory_schemas.js
 *       node scripts/seed_subcategory_schemas.js --dry-run   (preview only)
 *       node scripts/seed_subcategory_schemas.js --force     (overwrite all, even if already set)
 */

const { sequelize } = require('../models');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL BASE FIELDS — prepended to every subcategory schema
// These map directly to top-level product columns (price, deleted_price, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_FIELDS = [
    // ── Product Info ──────────────────────────────────────────────────────────
    { key: 'name',                label: 'Product Title / የምርት ስም',            type: 'text',     placeholder: 'e.g. Healthy Borena Bull, 3 years old', required: true,  group: 'Product Info' },
    { key: 'description',         label: 'Description / ዝርዝር ማብራሪያ',          type: 'textarea', placeholder: 'Describe the product in detail — condition, history, special features...', required: true,  group: 'Product Info' },

    // ── Pricing ──────────────────────────────────────────────────────────────
    { key: 'price',               label: 'Selling Price / የሽያጭ ዋጋ',         type: 'number',   placeholder: 'e.g. 15000', suffix: 'ETB', required: true,  group: 'Pricing' },
    { key: 'deleted_price',       label: 'Original Price / ከዋጋ ቅናሽ በፊት',   type: 'number',   placeholder: 'e.g. 18000 (leave blank if no discount)', suffix: 'ETB', required: false, group: 'Pricing' },
    { key: 'discount_percentage', label: 'Discount % / የዋጋ ቅናሽ',            type: 'number',   placeholder: 'e.g. 10',    suffix: '%',   required: false, group: 'Pricing' },
    { key: 'stock_quantity',      label: 'Quantity Available / ያለው ብዛት',     type: 'number',   placeholder: 'e.g. 1',                    required: true,  group: 'Pricing' },

    // ── Location (cascading: Region → City → Subcity → Woreda) ──────────────
    { key: 'ethiopia_location',   label: 'Location / አድራሻ',                  type: 'location_cascade', required: true,  group: 'Location',
      description: 'Select Region → City → Subcity → Woreda/Kebele' },
    { key: 'location',            label: 'Specific Address / ሙሉ አድራሻ',       type: 'text',     placeholder: 'Street name or landmark',         required: false, group: 'Location' },
    { key: 'pickup_available',    label: 'Pickup Available / መቀበል ይቻላል',     type: 'checkbox', required: false, group: 'Location' },
    { key: 'shipping_available',  label: 'Delivery Available / ዴሊቨሪ አለ',    type: 'checkbox', required: false, group: 'Location' },

    // ── Social Media ──────────────────────────────────────────────────────────
    { key: 'social_telegram',     label: 'Telegram Link / ቴሌግራም',            type: 'text',     placeholder: 'https://t.me/yourchannel',          required: false, group: 'Social Media' },
    { key: 'social_tiktok',       label: 'TikTok Link / ቲክቶክ',               type: 'text',     placeholder: 'https://tiktok.com/@yourpage',      required: false, group: 'Social Media' },
    { key: 'social_youtube',      label: 'YouTube Video / ዩቲዩብ',             type: 'text',     placeholder: 'https://youtube.com/watch?v=...',   required: false, group: 'Social Media' },
    { key: 'social_facebook',     label: 'Facebook / ፌስቡክ',                  type: 'text',     placeholder: 'https://facebook.com/yourpage',     required: false, group: 'Social Media' },
    { key: 'social_instagram',    label: 'Instagram / ኢንስታግራም',              type: 'text',     placeholder: 'https://instagram.com/yourhandle',  required: false, group: 'Social Media' },

    // ── SEO & Discoverability ─────────────────────────────────────────────────
    { key: 'tags',                label: 'Search Tags / የፍለጋ መለያዎች',          type: 'text',     placeholder: 'e.g. organic, fresh, Borena — comma separated', required: false, group: 'SEO' },
    { key: 'seo_title',           label: 'SEO Title / የፍለጋ ርዕስ',              type: 'text',     placeholder: 'Short title for search engines (max 60 chars)',  required: false, group: 'SEO' },
    { key: 'seo_description',     label: 'SEO Description / አጭር ማብራሪያ',      type: 'textarea', placeholder: 'Brief description for search engines (max 160 chars)', required: false, group: 'SEO' },
    { key: 'featured',            label: 'Featured Product / ተለይቶ የቀረበ',     type: 'checkbox', required: false, group: 'SEO' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DEFINITIONS — one per category type
// ─────────────────────────────────────────────────────────────────────────────

/** Cattle / Sheep / Goat / Pig / Camel / Horse / Donkey / Rabbit / etc. */
const LIVESTOCK_SCHEMA = [
    // ── Basic Info ───────────────────────────────────────────────────────────
    { key: 'breed',          label: 'Breed / ዝርያ',              type: 'text',     placeholder: 'e.g. Harari, Borena, Bale',  required: true,  group: 'Basic Info' },
    { key: 'gender',         label: 'Gender / ጾታ',              type: 'select',   required: true,  group: 'Basic Info',
      options: [{ value: 'male', label: 'Male / ወንድ' }, { value: 'female', label: 'Female / ሴት' }, { value: 'castrated', label: 'Castrated / ሙኩት' }] },
    { key: 'age_months',     label: 'Age (months) / ዕድሜ (ወር)',  type: 'number',   placeholder: 'e.g. 24',  suffix: 'months', required: true,  group: 'Basic Info' },
    { key: 'date_of_birth',  label: 'Date of Birth / የትውልድ ቀን', type: 'date',     required: false, group: 'Basic Info' },
    { key: 'color_markings', label: 'Color / ቀለም',              type: 'text',     placeholder: 'e.g. Brown with white patches', required: false, group: 'Basic Info' },

    // ── Physical ─────────────────────────────────────────────────────────────
    { key: 'weight_kg',      label: 'Weight / ክብደት',            type: 'number',   placeholder: 'e.g. 250', suffix: 'kg',  required: false, group: 'Physical' },
    { key: 'height_cm',      label: 'Height / ቁመት',             type: 'number',   placeholder: 'e.g. 120', suffix: 'cm',  required: false, group: 'Physical' },
    { key: 'body_condition',  label: 'Body Condition Score',      type: 'select',   required: false, group: 'Physical',
      options: [{ value: '1', label: '1 - Very thin' }, { value: '2', label: '2 - Thin' }, { value: '3', label: '3 - Moderate' }, { value: '4', label: '4 - Good' }, { value: '5', label: '5 - Fat' }] },

    // ── Health ───────────────────────────────────────────────────────────────
    { key: 'health_status',  label: 'Health Status / የጤና ሁኔታ',  type: 'select',   required: true,  group: 'Health',
      options: [{ value: 'excellent', label: 'Excellent / በጣም ጥሩ' }, { value: 'good', label: 'Good / ጥሩ' }, { value: 'fair', label: 'Fair / መካከለኛ' }, { value: 'poor', label: 'Poor / ደካማ' }] },
    { key: 'vaccinated',     label: 'Vaccinated / ክትባት',         type: 'checkbox', required: false, group: 'Health' },
    { key: 'vaccination_records', label: 'Vaccination Details / የክትባት ዝርዝር', type: 'textarea', placeholder: 'List vaccines and dates', required: false, group: 'Health' },
    { key: 'last_health_checkup', label: 'Last Health Check / የመጨረሻ ምርመራ',   type: 'date',     required: false, group: 'Health' },
    { key: 'veterinary_certificates', label: 'Vet Certificate # / የ獣医ሰርቲፊኬት', type: 'text',   placeholder: 'Certificate number', required: false, group: 'Health' },

    // ── Breeding ─────────────────────────────────────────────────────────────
    { key: 'is_pregnant',    label: 'Pregnant / እርጉዝ',           type: 'checkbox', required: false, group: 'Breeding' },
    { key: 'milk_production_liters_per_day', label: 'Milk Production / የወተት ምርት', type: 'number', placeholder: 'Liters per day', suffix: 'L/day', required: false, group: 'Breeding' },
    { key: 'offspring_count', label: 'Number of Offspring / ልጅ ብዛት', type: 'number', placeholder: '0', required: false, group: 'Breeding' },
];

/** Chicken / Poultry */
const CHICKEN_SCHEMA = [
    { key: 'breed',          label: 'Breed / ዝርያ',              type: 'text',     placeholder: 'e.g. Habesha, Broiler, Layer', required: true,  group: 'Basic Info' },
    { key: 'gender',         label: 'Gender / ጾታ',              type: 'select',   required: true,  group: 'Basic Info',
      options: [{ value: 'male', label: 'Cock / ዶሮ (ወንድ)' }, { value: 'female', label: 'Hen / ዶሮ (ሴት)' }, { value: 'mixed', label: 'Mixed / ድብልቅ' }] },
    { key: 'age_weeks',      label: 'Age / ዕድሜ',                type: 'number',   placeholder: 'e.g. 20', suffix: 'weeks',  required: true,  group: 'Basic Info' },
    { key: 'quantity',       label: 'Quantity / ቁጥር',            type: 'number',   placeholder: 'Number of birds', suffix: 'pcs',  required: true,  group: 'Basic Info' },
    { key: 'weight_kg',      label: 'Avg. Weight / አማካይ ክብደት',  type: 'number',   placeholder: 'e.g. 2.5', suffix: 'kg',  required: false, group: 'Basic Info' },
    { key: 'health_status',  label: 'Health Status / የጤና ሁኔታ',  type: 'select',   required: true,  group: 'Health',
      options: [{ value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }] },
    { key: 'vaccinated',     label: 'Vaccinated / ክትባት',         type: 'checkbox', required: false, group: 'Health' },
    { key: 'purpose',        label: 'Purpose / ዓላማ',             type: 'select',   required: false, group: 'Basic Info',
      options: [{ value: 'meat', label: 'Meat / ስጋ' }, { value: 'egg', label: 'Egg / እንቁላል' }, { value: 'dual', label: 'Dual Purpose' }] },
];

/** Feed / Hay / Concentrate */
const FEED_SCHEMA = [
    { key: 'feed_type',      label: 'Feed Type / የመኖ አይነት',      type: 'select',   required: true,  group: 'Details',
      options: [{ value: 'hay', label: 'Hay / ድርቆሽ' }, { value: 'silage', label: 'Silage' }, { value: 'concentrate', label: 'Concentrate' }, { value: 'grain', label: 'Grain / እህል' }, { value: 'mixed', label: 'Mixed / ድብልቅ' }] },
    { key: 'animal_type',    label: 'Suitable For / ለምን እንስሳ',    type: 'text',     placeholder: 'e.g. Cattle, Poultry, All', required: false, group: 'Details' },
    { key: 'weight_kg',      label: 'Package Weight / ክብደት',      type: 'number',   placeholder: 'e.g. 50', suffix: 'kg',  required: true,  group: 'Details' },
    { key: 'quantity_bags',  label: 'Quantity Available / ብዛት',   type: 'number',   placeholder: 'Number of bags/units', required: true,  group: 'Details' },
    { key: 'origin',         label: 'Origin / ምንጭ',               type: 'text',     placeholder: 'Region or farm name',  required: false, group: 'Details' },
    { key: 'expiry_date',    label: 'Expiry Date / ጊዜ ማብቂያ',      type: 'date',     required: false, group: 'Details' },
    { key: 'organic',        label: 'Organic / ኦርጋኒክ',            type: 'checkbox', required: false, group: 'Details' },
];

/** Bouquet Flowers — pre-arranged / cut */
const BOUQUET_SCHEMA = [
    { key: 'flower_types',   label: 'Flower Types / አበባ ዓይነቶች',   type: 'text',     placeholder: 'e.g. Roses, Lilies, Tulips', required: true,  group: 'Bouquet Details' },
    { key: 'color_palette',  label: 'Colors / ቀለሞች',               type: 'text',     placeholder: 'e.g. Red, White, Pink',      required: true,  group: 'Bouquet Details' },
    { key: 'stem_count',     label: 'Number of Stems / የቅጠል ብዛት',  type: 'number',   placeholder: 'e.g. 12', suffix: 'stems',   required: false, group: 'Bouquet Details' },
    { key: 'size',           label: 'Size / መጠን',                  type: 'select',   required: false, group: 'Bouquet Details',
      options: [{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }, { value: 'xl', label: 'Extra Large' }] },
    { key: 'occasion',       label: 'Occasion / አጋጣሚ',             type: 'text',     placeholder: 'e.g. Birthday, Wedding, Funeral', required: false, group: 'Bouquet Details' },
    { key: 'freshness_days', label: 'Freshness Duration / ትኩስነት',  type: 'number',   placeholder: 'Days', suffix: 'days', required: false, group: 'Bouquet Details' },
    { key: 'packaging',      label: 'Packaging / ማሸጊያ',            type: 'select',   required: false, group: 'Bouquet Details',
      options: [{ value: 'wrapped', label: 'Wrapped / ተጠቅልሎ' }, { value: 'box', label: 'Box / ሳጥን' }, { value: 'basket', label: 'Basket / ቅርጫት' }] },
    { key: 'custom_message', label: 'Custom Message / መልዕክት',      type: 'checkbox', required: false, group: 'Bouquet Details' },
    { key: 'delivery_same_day', label: 'Same-Day Delivery / ቀን ቀን ደሊቨሪ', type: 'checkbox', required: false, group: 'Delivery' },
];

/** Potted / Garden Plants */
const PLANT_SCHEMA = [
    { key: 'plant_name',     label: 'Plant Name / ተክሉ ስም',         type: 'text',     placeholder: 'Common & scientific name',   required: true,  group: 'Plant Info' },
    { key: 'plant_type',     label: 'Plant Type / ዓይነት',           type: 'select',   required: true,  group: 'Plant Info',
      options: [{ value: 'flowering', label: 'Flowering / አበባ' }, { value: 'foliage', label: 'Foliage / ቅጠላ' }, { value: 'succulent', label: 'Succulent / ሳክዩለንት' }, { value: 'tree', label: 'Tree / ዛፍ' }, { value: 'herb', label: 'Herb / ቅጠለ-ዕፅ' }, { value: 'vegetable', label: 'Vegetable / አትክልት' }] },
    { key: 'pot_size',       label: 'Pot Size / ማሰሮ መጠን',          type: 'select',   required: false, group: 'Plant Info',
      options: [{ value: 'small', label: 'Small (< 15cm)' }, { value: 'medium', label: 'Medium (15–25cm)' }, { value: 'large', label: 'Large (> 25cm)' }, { value: 'no_pot', label: 'Bare Root / No Pot' }] },
    { key: 'height_cm',      label: 'Plant Height / ቁመት',          type: 'number',   placeholder: 'e.g. 30', suffix: 'cm',      required: false, group: 'Plant Info' },
    { key: 'sunlight',       label: 'Sunlight Needs / ፀሐይ',        type: 'select',   required: false, group: 'Care',
      options: [{ value: 'full_sun', label: 'Full Sun' }, { value: 'partial', label: 'Partial Shade' }, { value: 'shade', label: 'Full Shade / ጥላ' }] },
    { key: 'watering',       label: 'Watering Frequency / ውሃ',     type: 'select',   required: false, group: 'Care',
      options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'rarely', label: 'Rarely' }] },
    { key: 'indoor_outdoor', label: 'Indoor / Outdoor',             type: 'select',   required: false, group: 'Care',
      options: [{ value: 'indoor', label: 'Indoor / ቤት ውስጥ' }, { value: 'outdoor', label: 'Outdoor / ቤት ውጭ' }, { value: 'both', label: 'Both' }] },
    { key: 'quantity',       label: 'Quantity / ብዛት',               type: 'number',   placeholder: 'Number of plants',           required: true,  group: 'Plant Info' },
    { key: 'medicinal_use',  label: 'Medicinal Use / ፈዋሽ ተክል',     type: 'textarea', placeholder: 'Describe medicinal uses if any', required: false, group: 'Care' },
];

/** Garden Decor / Pots / Tools */
const GARDEN_DECOR_SCHEMA = [
    { key: 'item_type',      label: 'Item Type / ዓይነት',            type: 'text',     placeholder: 'e.g. Pot, Watering can, Soil', required: true,  group: 'Details' },
    { key: 'material',       label: 'Material / ቁሳቁስ',             type: 'select',   required: false, group: 'Details',
      options: [{ value: 'clay', label: 'Clay / ሸክላ' }, { value: 'plastic', label: 'Plastic' }, { value: 'ceramic', label: 'Ceramic' }, { value: 'wood', label: 'Wood / እንጨት' }, { value: 'metal', label: 'Metal / ብረት' }, { value: 'stone', label: 'Stone / ድንጋይ' }] },
    { key: 'dimensions',     label: 'Dimensions / መጠን',            type: 'text',     placeholder: 'e.g. 30x30x40 cm',           required: false, group: 'Details' },
    { key: 'color',          label: 'Color / ቀለም',                 type: 'text',     placeholder: 'e.g. Terracotta, White',     required: false, group: 'Details' },
    { key: 'quantity',       label: 'Quantity / ብዛት',               type: 'number',   placeholder: 'Units available',            required: true,  group: 'Details' },
    { key: 'condition',      label: 'Condition / ሁኔታ',             type: 'select',   required: false, group: 'Details',
      options: [{ value: 'new', label: 'New / አዲስ' }, { value: 'used', label: 'Used / ጥቅም ላይ የዋለ' }] },
];

/** Electronics */
const ELECTRONICS_SCHEMA = [
    { key: 'brand',          label: 'Brand / ብራንድ',               type: 'text',     placeholder: 'e.g. Samsung, Apple',        required: true,  group: 'Product Info' },
    { key: 'model_number',   label: 'Model / ሞዴል',                type: 'text',     placeholder: 'e.g. iPhone 15 Pro',         required: true,  group: 'Product Info' },
    { key: 'condition',      label: 'Condition / ሁኔታ',            type: 'select',   required: true,  group: 'Product Info',
      options: [{ value: 'new', label: 'New / አዲስ' }, { value: 'like_new', label: 'Like New' }, { value: 'good', label: 'Good / ጥሩ' }, { value: 'fair', label: 'Fair / መካከለኛ' }] },
    { key: 'storage',        label: 'Storage / ማስቀመጫ',            type: 'text',     placeholder: 'e.g. 128GB, 256GB',         required: false, group: 'Specs' },
    { key: 'ram',            label: 'RAM',                         type: 'text',     placeholder: 'e.g. 8GB',                  required: false, group: 'Specs' },
    { key: 'color',          label: 'Color / ቀለም',                type: 'text',     placeholder: 'e.g. Black, Silver',        required: false, group: 'Specs' },
    { key: 'imei',           label: 'IMEI / Serial No.',          type: 'text',     placeholder: 'IMEI or serial number',     required: false, group: 'Specs' },
    { key: 'warranty',       label: 'Warranty / ዋስትና',            type: 'text',     placeholder: 'e.g. 6 months, No warranty', required: false, group: 'Product Info' },
    { key: 'accessories',    label: 'Included Accessories',        type: 'textarea', placeholder: 'e.g. Charger, Case, Box',  required: false, group: 'Product Info' },
    { key: 'purchase_date',  label: 'Purchase Date / የተገዛበት ቀን', type: 'date',     required: false, group: 'Product Info' },
    { key: 'network_bands',  label: 'Network Bands / ኔትወርክ',     type: 'text',     placeholder: 'e.g. 2G, 3G, 4G, 5G',     required: false, group: 'Specs' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY → SCHEMA mapping rules (matched against category name)
// ─────────────────────────────────────────────────────────────────────────────
function pickSchema(catName, subName) {
    const c = catName.toLowerCase();
    const s = subName.toLowerCase();

    if (/cattle|ቀንድ|cow|bull|ox|heifer|calf/.test(c)) return LIVESTOCK_SCHEMA;
    if (/sheep|በግ|goat|ፍየል|pig|camel|horse|donkey|rabbit/.test(c)) return LIVESTOCK_SCHEMA;
    if (/chicken|ዶሮ|poultry|duck|turkey/.test(c)) return CHICKEN_SCHEMA;
    if (/feed|መኖ|hay|fodder/.test(c)) return FEED_SCHEMA;
    if (/bouquet|አበቦች.*ታሰሩ|cut.*flower|flower.*arrangement/.test(c)) return BOUQUET_SCHEMA;
    if (/plant|አበቦች|flower|ተክል/.test(c)) return PLANT_SCHEMA;
    if (/garden.*decor|decore|ጓሮ.*ማስጌጫ|pot|container/.test(c)) return GARDEN_DECOR_SCHEMA;
    if (/electronic|mobile|phone|laptop|computer/.test(c)) return ELECTRONICS_SCHEMA;

    // Fall back by subcategory name
    if (/bull|cow|ox|calf|heifer|fattened|ሰንጋ|ላም|ኮርማ|ጊደር|ጥጃ|በሬ/.test(s)) return LIVESTOCK_SCHEMA;
    if (/buck|doe|kid|wether|ሙኩት|ፍየል/.test(s)) return LIVESTOCK_SCHEMA;
    if (/ewe|ram|lamb|hogget|ጠቦት|በግ/.test(s)) return LIVESTOCK_SCHEMA;
    if (/chicken|ዶሮ/.test(s)) return CHICKEN_SCHEMA;

    return null; // Unknown — skip
}

/** Prepend BASE_FIELDS (Pricing + Location) to any type-specific schema */
function buildSchema(catName, subName) {
    const specific = pickSchema(catName, subName);
    if (!specific) return null;
    return [...BASE_FIELDS, ...specific];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
    console.log(`\n🌱  Subcategory Schema Seed${DRY_RUN ? ' (DRY RUN)' : ''}${FORCE ? ' (FORCE overwrite)' : ''}\n`);

    const [subcategories] = await sequelize.query(`
        SELECT s.sub_cat_id, s.name AS sub_name, c.name AS cat_name,
               JSON_LENGTH(s.metadata_schema) AS current_field_count
        FROM product_subcategories s
        JOIN product_categories c ON s.cat_id = c.cat_id
        ORDER BY c.name, s.name
    `);

    let updated = 0, skipped = 0, noMatch = 0;

    for (const row of subcategories) {
        const schema = buildSchema(row.cat_name, row.sub_name);
        const alreadyHas = (row.current_field_count || 0) > 0;

        if (!schema) {
            console.log(`  ⚠️  No schema match for: [${row.cat_name}] ${row.sub_name}`);
            noMatch++;
            continue;
        }

        if (alreadyHas && !FORCE) {
            console.log(`  ℹ️  Skip (already has ${row.current_field_count} fields): ${row.sub_name}`);
            skipped++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`  🔍  Would seed ${schema.length} fields → [${row.cat_name}] ${row.sub_name}`);
            updated++;
            continue;
        }

        await sequelize.query(
            `UPDATE product_subcategories SET metadata_schema = ? WHERE sub_cat_id = ?`,
            { replacements: [JSON.stringify(schema), row.sub_cat_id] }
        );
        console.log(`  ✅  Seeded ${schema.length} fields → [${row.cat_name}] ${row.sub_name}`);
        updated++;
    }

    console.log(`\n📊  Summary:`);
    console.log(`   Updated : ${updated}`);
    console.log(`   Skipped : ${skipped} (already had schema; use --force to overwrite)`);
    console.log(`   No match: ${noMatch}`);

    await sequelize.close();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
