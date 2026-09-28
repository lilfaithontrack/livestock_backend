/**
 * Update all subcategory schemas on the PRODUCTION API.
 *
 * Rules:
 *   - Schemas contain ONLY subcategory-specific extra detail fields.
 *   - Universal fields (name, description, price, stock, location, shipping,
 *     social media, etc.) are NOT included — those already exist in the
 *     Basic / Pricing / Location / Images tabs of the mobile app.
 *   - Livestock schemas are trimmed to essential animal-specific fields.
 *   - Empty subcategories get new schemas appropriate to their domain.
 *
 * Run:  node scripts/update_all_schemas.js
 */
const PROD_BASE = 'https://api.shegergebeya.com/api/v1';
const ADMIN_EMAIL = 'abe@shegergebeya.com';
const ADMIN_PASSWORD = 'admin123';

// ─── Schema field builders ──────────────────────────────────────────────
const f = (key, label, type, extra = {}) => ({ key, label, type, ...extra });
const text = (key, label, extra = {}) => f(key, label, 'text', extra);
const num = (key, label, extra = {}) => f(key, label, 'number', extra);
const textarea = (key, label, extra = {}) => f(key, label, 'textarea', extra);
const date = (key, label, extra = {}) => f(key, label, 'date', extra);
const checkbox = (key, label, extra = {}) => f(key, label, 'checkbox', extra);
const select = (key, label, options, extra = {}) => f(key, label, 'select', { options, ...extra });

// ─── Reusable field groups ──────────────────────────────────────────────
const GENDER_OPTS = [
    { value: 'male', label: 'Male / ወንድ' },
    { value: 'female', label: 'Female / ሴት' },
    { value: 'castrated', label: 'Castrated / ሙኩት' },
];
const HEALTH_OPTS = [
    { value: 'excellent', label: 'Excellent / በጣም ጥሩ' },
    { value: 'good', label: 'Good / ጥሩ' },
    { value: 'fair', label: 'Fair / መካከለኛ' },
    { value: 'poor', label: 'Poor / ደካማ' },
];
const CONDITION_OPTS = [
    { value: 'new', label: 'New / አዲስ' },
    { value: 'like-new', label: 'Like New / አዲስ ያህል' },
    { value: 'used', label: 'Used / የተጠቀም' },
    { value: 'refurbished', label: 'Refurbished / ተቀርጿል' },
];

// Livestock — cattle (with milk production for dairy)
const CATTLE_SCHEMA = [
    text('breed', 'Breed / ዝርያ', { placeholder: 'e.g. Boran, Holstein, Fogera', required: true, group: 'Animal Info' }),
    select('gender', 'Gender / ጾታ', GENDER_OPTS, { required: true, group: 'Animal Info' }),
    num('age_months', 'Age (months) / ዕድሜ', { placeholder: 'e.g. 24', suffix: 'months', group: 'Animal Info' }),
    num('weight_kg', 'Weight / ክብደት', { placeholder: 'e.g. 250', suffix: 'kg', group: 'Animal Info' }),
    text('color_markings', 'Color / ቀለም', { placeholder: 'e.g. Brown with white patches', group: 'Animal Info' }),
    select('health_status', 'Health Status / የጤና ሁኔታ', HEALTH_OPTS, { group: 'Health' }),
    checkbox('vaccinated', 'Vaccinated / ክትባት ይደረጓል', { group: 'Health' }),
    num('milk_production_liters_per_day', 'Milk Production / የወተት ምርት', { placeholder: 'Liters per day', suffix: 'L/day', group: 'Production' }),
];

// Livestock — goat & sheep (no milk production)
const GOAT_SHEEP_SCHEMA = [
    text('breed', 'Breed / ዝርያ', { placeholder: 'e.g. Boer, Somali, Afar', required: true, group: 'Animal Info' }),
    select('gender', 'Gender / ጾታ', GENDER_OPTS, { required: true, group: 'Animal Info' }),
    num('age_months', 'Age (months) / ዕድሜ', { placeholder: 'e.g. 12', suffix: 'months', group: 'Animal Info' }),
    num('weight_kg', 'Weight / ክብደት', { placeholder: 'e.g. 35', suffix: 'kg', group: 'Animal Info' }),
    text('color_markings', 'Color / ቀለም', { placeholder: 'e.g. White with brown spots', group: 'Animal Info' }),
    select('health_status', 'Health Status / የጤና ሁኔታ', HEALTH_OPTS, { group: 'Health' }),
    checkbox('vaccinated', 'Vaccinated / ክትባት ይደረጓል', { group: 'Health' }),
];

// Chicken
const CHICKEN_SCHEMA = [
    text('breed', 'Breed / ዝርያ', { placeholder: 'e.g. Koekoek, Bovans Brown', required: true, group: 'Animal Info' }),
    select('gender', 'Gender / ጾታ', [
        { value: 'male', label: 'Rooster / ዶሮ' },
        { value: 'female', label: 'Hen / መንዳ' },
        { value: 'mixed', label: 'Mixed / ድብልቅ' },
    ], { required: true, group: 'Animal Info' }),
    num('age_weeks', 'Age (weeks) / ዕድሜ', { placeholder: 'e.g. 16', suffix: 'weeks', group: 'Animal Info' }),
    num('weight_kg', 'Weight / ክብደት', { placeholder: 'e.g. 2.5', suffix: 'kg', group: 'Animal Info' }),
    select('purpose', 'Purpose / ዓላማ', [
        { value: 'eggs', label: 'Egg production / እንቁላል' },
        { value: 'meat', label: 'Meat / ስጋ' },
        { value: 'dual', label: 'Dual purpose / ድርብ ዓላማ' },
        { value: 'breeding', label: 'Breeding / ዘር እናድ' },
    ], { group: 'Animal Info' }),
    select('health_status', 'Health Status / የጤና ሁኔታ', HEALTH_OPTS, { group: 'Health' }),
    checkbox('vaccinated', 'Vaccinated / ክትባት ይደረጓል', { group: 'Health' }),
];

// Mobile Phone
const MOBILE_PHONE_SCHEMA = [
    text('brand', 'Brand / ስም', { placeholder: 'e.g. Samsung, Apple, Xiaomi', required: true, group: 'Specifications' }),
    text('model_number', 'Model / ሞዴል', { placeholder: 'e.g. Galaxy A54, iPhone 13', group: 'Specifications' }),
    select('condition', 'Condition / ሁኔታ', CONDITION_OPTS, { required: true, group: 'Specifications' }),
    text('storage', 'Storage / ማከማቻ', { placeholder: 'e.g. 128GB, 256GB', group: 'Specifications' }),
    text('ram', 'RAM / RAM', { placeholder: 'e.g. 8GB', group: 'Specifications' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. Black, Blue', group: 'Specifications' }),
    text('imei', 'IMEI / IMEI', { placeholder: '15-digit IMEI number', group: 'Specifications' }),
    text('warranty', 'Warranty / ዋስትና', { placeholder: 'e.g. 6 months, 1 year, none', group: 'Warranty' }),
    textarea('accessories', 'Accessories Included / ተከታታይ እቃዎች', { placeholder: 'Charger, earphones, case, etc.', group: 'Warranty' }),
];

// Chicken Feed
const CHICKEN_FEED_SCHEMA = [
    select('feed_type', 'Feed Type / የመኖ ዓይነት', [
        { value: 'starter', label: 'Starter / ለጥቃ' },
        { value: 'grower', label: 'Grower / እድገት' },
        { value: 'layer', label: 'Layer / እንቁላል አሳይ' },
        { value: 'finisher', label: 'Finisher / መድረሻ' },
        { value: 'broiler', label: 'Broiler / ብሮይለር' },
    ], { required: true, group: 'Feed Info' }),
    text('animal_type', 'Target Animal / ለየትኛው እንስሳ', { placeholder: 'e.g. Chicken, Duck', group: 'Feed Info' }),
    num('weight_kg', 'Weight / ክብደት', { placeholder: 'e.g. 50', suffix: 'kg', group: 'Feed Info' }),
    num('quantity_bags', 'Number of Bags / ቦርሳ ብዛት', { placeholder: 'e.g. 10', group: 'Feed Info' }),
    text('origin', 'Origin / ምንጭ', { placeholder: 'e.g. Ethiopia, Imported', group: 'Feed Info' }),
    date('expiry_date', 'Expiry Date / የሚያልቅበት ቀን', { group: 'Feed Info' }),
    checkbox('organic', 'Organic / ኦርጋኒክ', { group: 'Feed Info' }),
];

// Honey
const HONEY_SCHEMA = [
    select('honey_type', 'Honey Type / የማር ዓይነት', [
        { value: 'wild', label: 'Wild / ዱር' },
        { value: 'farmed', label: 'Farmed / እርሻ' },
        { value: 'comb', label: 'Comb Honey / ማር ከነ ሰፈፉ' },
        { value: 'liquid', label: 'Liquid / ፈሳሽ' },
        { value: 'creamed', label: 'Creamed / ክሬም ድረግ' },
    ], { required: true, group: 'Honey Info' }),
    text('origin', 'Origin / ምንጭ ቦታ', { placeholder: 'e.g. Welo, Tigray, Gojjam', group: 'Honey Info' }),
    num('weight_kg', 'Weight / ክብደት', { placeholder: 'e.g. 1', suffix: 'kg', group: 'Honey Info' }),
    date('harvest_date', 'Harvest Date / የተሰበቀበት ቀን', { group: 'Honey Info' }),
    text('purity', 'Purity / ንፁህነት', { placeholder: 'e.g. 100% pure', group: 'Honey Info' }),
];

// Plants
const PLANT_SCHEMA = [
    text('plant_name', 'Plant Name / የተክል ስም', { placeholder: 'e.g. Aloe Vera, Rose', required: true, group: 'Plant Info' }),
    select('plant_type', 'Plant Type / የተክል ዓይነት', [
        { value: 'flowering', label: 'Flowering / አበባ' },
        { value: 'succulent', label: 'Succulent / ሱክለረንት' },
        { value: 'herb', label: 'Herb / ሕዝብ' },
        { value: 'tree', label: 'Tree / ዛፍ' },
        { value: 'shrub', label: 'Shrub / ቊጥቋጥ' },
    ], { group: 'Plant Info' }),
    text('pot_size', 'Pot Size / የማሰሪያ መጠን', { placeholder: 'e.g. 15cm, 20cm', group: 'Plant Info' }),
    num('height_cm', 'Height / ቁመት', { placeholder: 'e.g. 30', suffix: 'cm', group: 'Plant Info' }),
    select('sunlight', 'Sunlight Need / የፀሐይ ብርሃን', [
        { value: 'full', label: 'Full sun / ሙሉ ፀሐይ' },
        { value: 'partial', label: 'Partial shade / ከፊል ጥላ' },
        { value: 'shade', label: 'Full shade / ሙሉ ጥላ' },
    ], { group: 'Care' }),
    select('watering', 'Watering / የውሃ አቅግ', [
        { value: 'daily', label: 'Daily / በየቀኑ' },
        { value: 'weekly', label: 'Weekly / በየሳምንቱ' },
        { value: 'biweekly', label: 'Bi-weekly / በሁለት ሳምንት' },
        { value: 'monthly', label: 'Monthly / በወር' },
    ], { group: 'Care' }),
    select('indoor_outdoor', 'Placement / ቦታ', [
        { value: 'indoor', label: 'Indoor / ውስጥ' },
        { value: 'outdoor', label: 'Outdoor / ውጭ' },
        { value: 'both', label: 'Both / ሁለቱም' },
    ], { group: 'Care' }),
    textarea('medicinal_use', 'Medicinal Use / የመድኃኒት አጠቃቀም', { placeholder: 'e.g. Used for skin care, digestion...', group: 'Care' }),
];

// Bouquet Flowers
const BOUQUET_SCHEMA = [
    textarea('flower_types', 'Flower Types / የአበባ ዓይነቶች', { placeholder: 'e.g. Roses, Lilies, Tulips', required: true, group: 'Bouquet Info' }),
    text('color_palette', 'Color Palette / የቀለም ጥንድ', { placeholder: 'e.g. Red & White, Pink & Purple', group: 'Bouquet Info' }),
    num('stem_count', 'Number of Stems / የግንድ ብዛት', { placeholder: 'e.g. 12', group: 'Bouquet Info' }),
    select('size', 'Size / መጠን', [
        { value: 'small', label: 'Small / ትንሽ' },
        { value: 'medium', label: 'Medium / መካከለኛ' },
        { value: 'large', label: 'Large / ትልቅ' },
        { value: 'xl', label: 'Extra Large / በጣም ትልቅ' },
    ], { group: 'Bouquet Info' }),
    select('occasion', 'Occasion / አጋጣሚ', [
        { value: 'romantic', label: 'Romantic / ፍቅር' },
        { value: 'birthday', label: 'Birthday / ልደት' },
        { value: 'wedding', label: 'Wedding / ሰርግ' },
        { value: 'condolence', label: 'Condolence / ሐዘን' },
        { value: 'congrats', label: 'Congratulations / ምስጋና' },
        { value: 'any', label: 'Any occasion / ማንኛውም' },
    ], { group: 'Bouquet Info' }),
    num('freshness_days', 'Freshness Guarantee / የትድስስ ጊዜ', { placeholder: 'e.g. 5', suffix: 'days', group: 'Bouquet Info' }),
    textarea('packaging', 'Packaging / ማሸጊያ', { placeholder: 'e.g. Gift wrap, ribbon, vase included', group: 'Bouquet Info' }),
    text('custom_message', 'Custom Message / የግል መልዕክት', { placeholder: 'Message on the card', group: 'Bouquet Info' }),
    checkbox('delivery_same_day', 'Same Day Delivery / በዚያ ቀን ዴሊቨሪ', { group: 'Bouquet Info' }),
];

// ─── Construction material schemas ──────────────────────────────────────
const SAFETY_GEAR_SCHEMA = [
    select('gear_type', 'Gear Type / ዓይነት', [
        { value: 'helmet', label: 'Helmet / የደህንነት ካፕ' },
        { value: 'boots', label: 'Boots / ጫማ' },
        { value: 'vest', label: 'Reflective Vest / ሪፍሌክቲቭ' },
        { value: 'gloves', label: 'Gloves / ጓንቲ' },
        { value: 'goggles', label: 'Goggles / መነጽር' },
    ], { required: true, group: 'Product Details' }),
    text('size', 'Size / መጠን', { placeholder: 'e.g. M, L, XL, 42', group: 'Product Details' }),
    text('material', 'Material / ቁሳቁስ', { placeholder: 'e.g. Polycarbonate, Leather', group: 'Product Details' }),
    text('safety_standard', 'Safety Standard / የደህንነት ደረጃ', { placeholder: 'e.g. ISI, CE, ANSI', group: 'Certification' }),
    text('certification', 'Certification / ሰርቲፊኬት', { placeholder: 'e.g. ISO 9001', group: 'Certification' }),
];

const HAND_TOOLS_SCHEMA = [
    text('tool_type', 'Tool Type / የመሳሪያ ዓይነት', { placeholder: 'e.g. Hammer, Shovel, Wheelbarrow', required: true, group: 'Tool Details' }),
    text('material', 'Material / ቁሳቁስ', { placeholder: 'e.g. Steel head, wooden handle', group: 'Tool Details' }),
    text('handle_type', 'Handle Type / የእጅ ዓይነት', { placeholder: 'e.g. Wooden, Fiberglass, Metal', group: 'Tool Details' }),
    num('length_cm', 'Length / ርዝመት', { placeholder: 'e.g. 35', suffix: 'cm', group: 'Tool Details' }),
    text('warranty', 'Warranty / ዋስትና', { placeholder: 'e.g. 1 year', group: 'Tool Details' }),
];

const CONSTRUCTION_CHEMICALS_SCHEMA = [
    select('chemical_type', 'Chemical Type / ዓይነት', [
        { value: 'waterproofing', label: 'Waterproofing / የውሃ መከላከያ' },
        { value: 'admixture', label: 'Admixture / አድሚክስቸር' },
        { value: 'sealant', label: 'Sealant / ሲሊንት' },
        { value: 'bonding', label: 'Bonding Agent / ቦንዲንግ' },
    ], { required: true, group: 'Chemical Details' }),
    text('application', 'Application / አጠቃቀም', { placeholder: 'e.g. Concrete, plaster, tiles', group: 'Chemical Details' }),
    num('coverage_sqm', 'Coverage / ሽፋን', { placeholder: 'e.g. 5', suffix: 'sqm', group: 'Chemical Details' }),
    num('volume_liters', 'Volume / መጠን', { placeholder: 'e.g. 20', suffix: 'liters', group: 'Chemical Details' }),
];

const DIST_BOARDS_SCHEMA = [
    text('amperage', 'Amperage / አምፔር', { placeholder: 'e.g. 63A, 100A', required: true, group: 'Electrical Specs' }),
    num('poles', 'Number of Poles / ፖል ብዛት', { placeholder: 'e.g. 4', group: 'Electrical Specs' }),
    text('voltage_rating', 'Voltage Rating / ቮልት', { placeholder: 'e.g. 230V, 400V', group: 'Electrical Specs' }),
    text('brand', 'Brand / ስም', { placeholder: 'e.g. ABB, Schneider', group: 'Electrical Specs' }),
    text('certification', 'Certification / ሰርቲፊኬት', { placeholder: 'e.g. CE, ISO', group: 'Electrical Specs' }),
];

const CONDUITS_SCHEMA = [
    select('material', 'Material / ቁሳቁስ', [
        { value: 'pvc', label: 'PVC / PVC' },
        { value: 'metal', label: 'Metal / ብረት' },
        { value: 'flexible', label: 'Flexible / ፍሌክስብል' },
    ], { required: true, group: 'Product Details' }),
    num('diameter_mm', 'Diameter / ዲያሜትር', { placeholder: 'e.g. 20', suffix: 'mm', group: 'Product Details' }),
    num('length_m', 'Length / ርዝመት', { placeholder: 'e.g. 3', suffix: 'm', group: 'Product Details' }),
    text('ip_rating', 'IP Rating / IP ደረጃ', { placeholder: 'e.g. IP65', group: 'Product Details' }),
];

const SWITCHES_SOCKETS_SCHEMA = [
    select('type', 'Type / ዓይነት', [
        { value: 'switch', label: 'Switch / ማብሪያ' },
        { value: 'socket', label: 'Socket / ሶኬት' },
        { value: 'combo', label: 'Combo / ድብልቅ' },
    ], { required: true, group: 'Product Details' }),
    text('amperage', 'Amperage / አምፔር', { placeholder: 'e.g. 13A, 16A', group: 'Product Details' }),
    text('voltage_rating', 'Voltage Rating / ቮልት', { placeholder: 'e.g. 250V', group: 'Product Details' }),
    num('gang_count', 'Gang Count / ቁጥር', { placeholder: 'e.g. 2', group: 'Product Details' }),
    text('material', 'Material / ቁሳቁስ', { placeholder: 'e.g. Plastic, Metal', group: 'Product Details' }),
];

const CABLES_WIRES_SCHEMA = [
    select('wire_type', 'Wire Type / ዓይነት', [
        { value: 'copper', label: 'Copper / ነሐስ' },
        { value: 'aluminum', label: 'Aluminum / አሉሚኒየም' },
    ], { required: true, group: 'Cable Specs' }),
    text('cross_section_mm2', 'Cross Section / መሃል ስፋት', { placeholder: 'e.g. 2.5mm², 4mm²', group: 'Cable Specs' }),
    num('length_m', 'Length / ርዝመት', { placeholder: 'e.g. 90', suffix: 'm', group: 'Cable Specs' }),
    text('voltage_rating', 'Voltage Rating / ቮልት', { placeholder: 'e.g. 450/750V', group: 'Cable Specs' }),
    num('core_count', 'Number of Cores / ኮር ብዛት', { placeholder: 'e.g. 3', group: 'Cable Specs' }),
];

const LIGHT_BULBS_SCHEMA = [
    num('wattage', 'Wattage / ዋት', { placeholder: 'e.g. 9', suffix: 'W', required: true, group: 'Bulb Specs' }),
    select('bulb_type', 'Bulb Type / ዓይነት', [
        { value: 'led', label: 'LED / LED' },
        { value: 'cfl', label: 'CFL / CFL' },
        { value: 'incandescent', label: 'Incandescent / ባህላዊ' },
        { value: 'halogen', label: 'Halogen / ሃሎጅን' },
    ], { group: 'Bulb Specs' }),
    text('base_type', 'Base Type / መሰረት', { placeholder: 'e.g. E27, E14, B22', group: 'Bulb Specs' }),
    text('voltage', 'Voltage / ቮልት', { placeholder: 'e.g. 220V', group: 'Bulb Specs' }),
    num('lumens', 'Lumens / የብርሃን መጠን', { placeholder: 'e.g. 800', group: 'Bulb Specs' }),
    text('color_temperature', 'Color Temperature / የቀለም ሙቀት', { placeholder: 'e.g. 3000K Warm, 6000K Cool', group: 'Bulb Specs' }),
];

const FAUCETS_VALVES_SCHEMA = [
    select('material', 'Material / ቁሳቁስ', [
        { value: 'brass', label: 'Brass / ሐርሐር' },
        { value: 'stainless', label: 'Stainless Steel / ስቴንሌስ' },
        { value: 'plastic', label: 'Plastic / ፕላስቲክ' },
        { value: 'chrome', label: 'Chrome / ክሮም' },
    ], { required: true, group: 'Product Details' }),
    select('valve_type', 'Valve Type / ዓይነት', [
        { value: 'mixer', label: 'Mixer / ሚክሰር' },
        { value: 'ball', label: 'Ball Valve / ቦል ቫልቭ' },
        { value: 'gate', label: 'Gate Valve / ጌት ቫልቭ' },
        { value: 'check', label: 'Check Valve / ቼክ ቫልቭ' },
    ], { group: 'Product Details' }),
    text('diameter_inch', 'Diameter / ዲያሜትር', { placeholder: 'e.g. 1/2", 3/4"', group: 'Product Details' }),
    text('finish', 'Finish / ፊኒሽ', { placeholder: 'e.g. Chrome polished, Matte', group: 'Product Details' }),
];

const WATER_TANKS_SCHEMA = [
    num('capacity_liters', 'Capacity / አቅም', { placeholder: 'e.g. 1000', suffix: 'liters', required: true, group: 'Tank Specs' }),
    select('material', 'Material / ቁሳቁስ', [
        { value: 'plastic', label: 'Plastic / ፕላስቲክ' },
        { value: 'steel', label: 'Steel / ብረት' },
        { value: 'concrete', label: 'Concrete / ኮንክሪት' },
    ], { group: 'Tank Specs' }),
    select('shape', 'Shape / ቅርፅ', [
        { value: 'cylindrical', label: 'Cylindrical / ሳህን ቅርፅ' },
        { value: 'rectangular', label: 'Rectangular / አራት ማዕዘን' },
    ], { group: 'Tank Specs' }),
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 100x80cm', group: 'Tank Specs' }),
];

const SANITARY_WARE_SCHEMA = [
    select('product_type', 'Product Type / ዓይነት', [
        { value: 'toilet', label: 'Toilet / መፀወቂያ' },
        { value: 'sink', label: 'Sink / ሚዛን' },
        { value: 'shower', label: 'Shower / ሻወር' },
        { value: 'bidet', label: 'Bidet / ቢዴ' },
    ], { required: true, group: 'Product Details' }),
    text('material', 'Material / ቁሳቁስ', { placeholder: 'e.g. Ceramic, Porcelain', group: 'Product Details' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. White, Ivory', group: 'Product Details' }),
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 60x40cm', group: 'Product Details' }),
    select('installation_type', 'Installation / አንጓጣጠም', [
        { value: 'floor', label: 'Floor mounted / በመሬት' },
        { value: 'wall', label: 'Wall mounted / በግድግዳ' },
    ], { group: 'Product Details' }),
];

const PIPES_FITTINGS_SCHEMA = [
    select('material', 'Material / ቁሳቁስ', [
        { value: 'ppr', label: 'PPR / PPR' },
        { value: 'pvc', label: 'PVC / PVC' },
        { value: 'hdpe', label: 'HDPE / HDPE' },
        { value: 'cpvc', label: 'CPVC / CPVC' },
    ], { required: true, group: 'Pipe Specs' }),
    num('diameter_mm', 'Diameter / ዲያሜትር', { placeholder: 'e.g. 25', suffix: 'mm', group: 'Pipe Specs' }),
    num('length_m', 'Length / ርዝመት', { placeholder: 'e.g. 4', suffix: 'm', group: 'Pipe Specs' }),
    text('pressure_rating_bar', 'Pressure Rating / የግፊት ደረጃ', { placeholder: 'e.g. 10 bar, 16 bar', group: 'Pipe Specs' }),
    text('fitting_type', 'Fitting Type / የተያያዣ ዓይነት', { placeholder: 'e.g. Elbow, Tee, Coupler', group: 'Pipe Specs' }),
];

const TILES_SCHEMA = [
    select('material', 'Material / ቁሳቁስ', [
        { value: 'ceramic', label: 'Ceramic / ሴራሚክ' },
        { value: 'porcelain', label: 'Porcelain / ፖርሴሌን' },
        { value: 'marble', label: 'Marble / ማርማር' },
    ], { required: true, group: 'Tile Details' }),
    text('size', 'Size / መጠን', { placeholder: 'e.g. 60x60cm, 30x60cm', group: 'Tile Details' }),
    num('thickness_mm', 'Thickness / ውፍረት', { placeholder: 'e.g. 8', suffix: 'mm', group: 'Tile Details' }),
    select('finish', 'Finish / ፊኒሽ', [
        { value: 'glossy', label: 'Glossy / ብርሃን ያለ' },
        { value: 'matte', label: 'Matte / ማታ' },
        { value: 'polished', label: 'Polished / ፖሊሽድ' },
    ], { group: 'Tile Details' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. Beige, Grey', group: 'Tile Details' }),
    num('sqm_per_box', 'Coverage per Box / ቦርሳ ሽፋን', { placeholder: 'e.g. 1.44', suffix: 'sqm', group: 'Tile Details' }),
];

const PAINTS_SCHEMA = [
    select('paint_type', 'Paint Type / ዓይነት', [
        { value: 'plastic', label: 'Plastic Paint / ፕላስቲክ' },
        { value: 'quartz', label: 'Quartz / ኩዋርትዝ' },
        { value: 'weathercoat', label: 'Weathercoat / ዌዘርኮት' },
        { value: 'primer', label: 'Primer / ፕራይመር' },
        { value: 'enamel', label: 'Enamel / ኢናሚል' },
    ], { required: true, group: 'Paint Details' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. White, RAL 9010', group: 'Paint Details' }),
    num('volume_liters', 'Volume / መጠን', { placeholder: 'e.g. 20', suffix: 'liters', group: 'Paint Details' }),
    num('coverage_sqm', 'Coverage / ሽፋን', { placeholder: 'e.g. 120', suffix: 'sqm', group: 'Paint Details' }),
    select('finish', 'Finish / ፊኒሽ', [
        { value: 'glossy', label: 'Glossy / ብርሃን ያለ' },
        { value: 'matte', label: 'Matte / ማታ' },
        { value: 'satin', label: 'Satin / ሳቲን' },
    ], { group: 'Paint Details' }),
];

const GYPSUM_SCHEMA = [
    num('thickness_mm', 'Thickness / ውፍረት', { placeholder: 'e.g. 12.5', suffix: 'mm', required: true, group: 'Board Specs' }),
    num('width_cm', 'Width / ስፋት', { placeholder: 'e.g. 120', suffix: 'cm', group: 'Board Specs' }),
    num('length_cm', 'Length / ርዝመት', { placeholder: 'e.g. 240', suffix: 'cm', group: 'Board Specs' }),
    select('edge_type', 'Edge Type / የጠርዝ ዓይነት', [
        { value: 'tapered', label: 'Tapered / ተሸቋሽ' },
        { value: 'square', label: 'Square / ካሬ' },
        { value: 'rounded', label: 'Rounded / ክብ' },
    ], { group: 'Board Specs' }),
    text('fire_rating', 'Fire Rating / የእሳት ደረጃ', { placeholder: 'e.g. 30min, 60min', group: 'Board Specs' }),
];

const MARBLE_GRANITE_SCHEMA = [
    select('material', 'Material / ቁሳቁስ', [
        { value: 'marble', label: 'Marble / ማርብል' },
        { value: 'granite', label: 'Granite / ግራናይት' },
    ], { required: true, group: 'Stone Details' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. White, Black, Green', group: 'Stone Details' }),
    num('thickness_mm', 'Thickness / ውፍረት', { placeholder: 'e.g. 20', suffix: 'mm', group: 'Stone Details' }),
    select('finish', 'Finish / ፊኒሽ', [
        { value: 'polished', label: 'Polished / ፖሊሽድ' },
        { value: 'honed', label: 'Honed / ሆንድ' },
        { value: 'flamed', label: 'Flamed / ፍሌምድ' },
    ], { group: 'Stone Details' }),
    text('origin', 'Origin / ምንጭ', { placeholder: 'e.g. Ethiopia, Italy', group: 'Stone Details' }),
];

const CONCRETE_BLOCKS_SCHEMA = [
    select('block_type', 'Block Type / ዓይነት', [
        { value: 'hollow', label: 'Hollow / ባዶ' },
        { value: 'solid', label: 'Solid / ጠንካራ' },
        { value: 'interlocking', label: 'Interlocking / ኢንተርሎኪንግ' },
    ], { required: true, group: 'Block Specs' }),
    text('strength_grade', 'Strength Grade / ጠንካሮነት', { placeholder: 'e.g. 5N/mm², 7N/mm²', group: 'Block Specs' }),
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 40x20x20cm', group: 'Block Specs' }),
];

const CLAY_BRICKS_SCHEMA = [
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 24x12x7cm', group: 'Brick Specs' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. Red, Brown', group: 'Brick Specs' }),
    text('compressive_strength', 'Compressive Strength / ግፊት ጥንካሬ', { placeholder: 'e.g. 10N/mm²', group: 'Brick Specs' }),
];

const PAVING_BLOCKS_SCHEMA = [
    select('material', 'Material / ቁሳቁስ', [
        { value: 'concrete', label: 'Concrete / ኮንክሪት' },
        { value: 'clay', label: 'Clay / ሸክያ' },
        { value: 'stone', label: 'Stone / ድንጋይ' },
    ], { required: true, group: 'Paver Specs' }),
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 10x20x6cm', group: 'Paver Specs' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. Grey, Red, Multi', group: 'Paver Specs' }),
    num('thickness_mm', 'Thickness / ውፍረት', { placeholder: 'e.g. 60', suffix: 'mm', group: 'Paver Specs' }),
];

const AGGREGATE_SCHEMA = [
    text('stone_size_mm', 'Stone Size / የድንጋይ መጠን', { placeholder: 'e.g. 3/4, 3/8, dust', group: 'Material Specs' }),
    text('origin', 'Origin / ምንጭ', { placeholder: 'e.g. Crushed limestone', group: 'Material Specs' }),
    num('volume_cubic_m', 'Volume / መጠን', { placeholder: 'e.g. 5', suffix: 'm³', group: 'Material Specs' }),
];

const RED_ASH_SCHEMA = [
    text('origin', 'Origin / ምንጭ', { placeholder: 'e.g. Local quarry', group: 'Material Specs' }),
    num('volume_cubic_m', 'Volume / መጠን', { placeholder: 'e.g. 10', suffix: 'm³', group: 'Material Specs' }),
    text('grade', 'Grade / ደረጃ', { placeholder: 'e.g. Fine, Coarse', group: 'Material Specs' }),
];

const STONE_BLOCKS_SCHEMA = [
    select('stone_type', 'Stone Type / ዓይነት', [
        { value: 'basalt', label: 'Basalt / ባዛልት' },
        { value: 'granite', label: 'Granite / ግራናይት' },
        { value: 'limestone', label: 'Limestone / ሸክያ' },
        { value: 'sandstone', label: 'Sandstone / የባሕር ድንጋይ' },
    ], { required: true, group: 'Stone Specs' }),
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 50x30x25cm', group: 'Stone Specs' }),
    text('origin', 'Origin / ምንጭ', { placeholder: 'e.g. Local quarry', group: 'Stone Specs' }),
];

const RIVER_SAND_SCHEMA = [
    text('origin', 'Origin / ምንጭ ወንዝ', { placeholder: 'e.g. Awash, Omo', group: 'Sand Specs' }),
    num('volume_cubic_m', 'Volume / መጠን', { placeholder: 'e.g. 5', suffix: 'm³', group: 'Sand Specs' }),
    text('grain_size', 'Grain Size / የአሸዋ መጠን', { placeholder: 'e.g. Fine, Medium, Coarse', group: 'Sand Specs' }),
];

const REBAR_SCHEMA = [
    num('diameter_mm', 'Diameter / ዲያሜትር', { placeholder: 'e.g. 12', suffix: 'mm', required: true, group: 'Rebar Specs' }),
    text('grade', 'Grade / ደረጃ', { placeholder: 'e.g. Grade 60, Grade 40', group: 'Rebar Specs' }),
    num('length_m', 'Length / ርዝመት', { placeholder: 'e.g. 12', suffix: 'm', group: 'Rebar Specs' }),
    text('standard', 'Standard / ደረጃ', { placeholder: 'e.g. ASTM A615, BS 4449', group: 'Rebar Specs' }),
];

const HOLLOW_SECTIONS_SCHEMA = [
    select('profile_type', 'Profile Type / ፕሮፋይል', [
        { value: 'square', label: 'Square / ካሬ' },
        { value: 'rectangular', label: 'Rectangular / አራት ማዕዘን' },
        { value: 'circular', label: 'Circular / ክብ' },
    ], { required: true, group: 'Section Specs' }),
    text('dimensions', 'Dimensions / መጠኖች', { placeholder: 'e.g. 50x50mm', group: 'Section Specs' }),
    num('thickness_mm', 'Wall Thickness / ውፍረት', { placeholder: 'e.g. 2', suffix: 'mm', group: 'Section Specs' }),
    num('length_m', 'Length / ርዝመት', { placeholder: 'e.g. 6', suffix: 'm', group: 'Section Specs' }),
];

const WIRE_NAILS_SCHEMA = [
    text('gauge', 'Gauge / ጌጅ', { placeholder: 'e.g. 12G, 14G', required: true, group: 'Product Details' }),
    select('material', 'Material / ቁሳቁስ', [
        { value: 'steel', label: 'Steel / ብረት' },
        { value: 'galvanized', label: 'Galvanized / ጋልቫናይዝድ' },
    ], { group: 'Product Details' }),
    num('weight_kg', 'Weight / ክብደት', { placeholder: 'e.g. 5', suffix: 'kg', group: 'Product Details' }),
    text('length_mm', 'Nail Length / ርዝመት', { placeholder: 'e.g. 50mm, 75mm', group: 'Product Details' }),
];

const IRON_SHEETS_SCHEMA = [
    num('thickness_mm', 'Thickness / ውፍረት', { placeholder: 'e.g. 0.4', suffix: 'mm', required: true, group: 'Sheet Specs' }),
    num('length_m', 'Length / ርዝመት', { placeholder: 'e.g. 3', suffix: 'm', group: 'Sheet Specs' }),
    num('width_m', 'Width / ስፋት', { placeholder: 'e.g. 1', suffix: 'm', group: 'Sheet Specs' }),
    text('profile', 'Profile / ፕሮፋይል', { placeholder: 'e.g. Corrugated, Trapezoidal', group: 'Sheet Specs' }),
    text('color', 'Color / ቀለም', { placeholder: 'e.g. Red, Green, Blue', group: 'Sheet Specs' }),
];

const CEMENT_SCHEMA = [
    select('cement_type', 'Cement Type / ዓይነት', [
        { value: 'opc', label: 'OPC (Ordinary Portland)' },
        { value: 'ppc', label: 'PPC (Portland Pozzolana)' },
        { value: 'white', label: 'White Cement / ነጭ ሲሚንቶ' },
    ], { required: true, group: 'Cement Details' }),
    text('grade', 'Grade / ደረጃ', { placeholder: 'e.g. 42.5N, 32.5N', group: 'Cement Details' }),
    num('weight_kg', 'Weight per Bag / ቦርሳ ክብደት', { placeholder: 'e.g. 50', suffix: 'kg', group: 'Cement Details' }),
    text('standard', 'Standard / ደረጃ', { placeholder: 'e.g. ES CDQ 1186', group: 'Cement Details' }),
];

// ─── Schema map keyed by sub_cat_id ─────────────────────────────────────
const SCHEMAS = {
    // ── Cattle (8) — trimmed to 8 essential livestock-specific fields ──
    '052d5444-44a7-4deb-87db-011d63343c22': CATTLE_SCHEMA, // Cow
    '1624ca78-2ed4-42b0-abca-28949f380884': CATTLE_SCHEMA, // Calf
    '1d800697-4ae6-447e-9be1-25601e92bd12': CATTLE_SCHEMA, // Fattened ox
    '688a96bd-8bc1-4393-a92e-5500cee826b0': CATTLE_SCHEMA, // cull cow
    '74a7c06a-92e8-490d-90ec-8b14d44834a1': CATTLE_SCHEMA, // Ox
    'b2169f6a-9578-4e96-a6b3-8954f89ce6f9': CATTLE_SCHEMA, // Heifer
    'b24b3105-63a6-4b92-ac55-ba628cb96a08': CATTLE_SCHEMA, // Young Bull
    'c03793d2-a061-4d1e-97bd-5d917d2b4225': CATTLE_SCHEMA, // Bull

    // ── Goat (7) — trimmed to 7 essential fields ──
    '1da211c1-4b99-4e31-b412-48965d3c684f': GOAT_SHEEP_SCHEMA, // wether
    '35f8132c-2b98-469d-876d-5740b3ce6e1c': GOAT_SHEEP_SCHEMA, // Doeling
    '6999d7ac-2c5e-4060-9f16-64469de0adf0': GOAT_SHEEP_SCHEMA, // Buckling
    '97aa7efa-9d47-41f0-8046-0ae3142f3ba8': GOAT_SHEEP_SCHEMA, // Kid
    'db6e6db9-8ffb-40e3-a70d-93b238b669ed': GOAT_SHEEP_SCHEMA, // Old Doe
    'efb4c772-efa9-41a3-8733-9022081c5ba0': GOAT_SHEEP_SCHEMA, // Buck
    'fa476cee-778c-434d-a438-fd44b38c737f': GOAT_SHEEP_SCHEMA, // Doe/Nanny

    // ── Sheep (8) — same as goat ──
    '5eb48bf9-8bfc-484e-8305-8d7ba2073275': GOAT_SHEEP_SCHEMA, // Lamb
    '90f15a75-ee22-4d38-8ef3-6a82be93e3bc': GOAT_SHEEP_SCHEMA, // Ewe lamb
    '9e65e359-292c-491d-b72d-2b62df1f02c5': GOAT_SHEEP_SCHEMA, // Ram Lamb
    'aea6a976-cde1-479a-bb1a-8b38f3f32c99': GOAT_SHEEP_SCHEMA, // Hogget/Gimmer
    'bf7326a6-2a3e-49c9-b03e-1a463dd93553': GOAT_SHEEP_SCHEMA, // Ewe
    'c2d376f5-3b7d-40e4-9198-07aab6d5bd78': GOAT_SHEEP_SCHEMA, // Yearling Ram
    'd94d78ca-f028-4889-8a8a-061eeee9deb2': GOAT_SHEEP_SCHEMA, // Weather
    'f05f53be-c06c-4bc3-9cbc-7116977847de': GOAT_SHEEP_SCHEMA, // Ram /Tup

    // ── Chicken (2) ──
    '01efc509-c419-4e82-ae48-02d08f45d69b': CHICKEN_SCHEMA, // Yeferenji
    '4c89594e-1944-4e2f-a1dd-1a2c2208253d': CHICKEN_SCHEMA, // Habesha

    // ── Electronics (1) ──
    '3784bff2-635b-4ee3-a05f-1a2507f0aa00': MOBILE_PHONE_SCHEMA, // Mobile Phone

    // ── Feeds (1) ──
    'cbbd0714-4d5e-4da4-84ca-03d47e347d37': CHICKEN_FEED_SCHEMA, // Chicken Feed

    // ── Honey (2) — NEW schemas ──
    '734c80db-c8e1-47b9-a5fd-4779694b4d84': HONEY_SCHEMA, // ወለላ ማር
    '78b22aa6-586d-4f02-8492-731dcb003b80': HONEY_SCHEMA, // ማር ከነ ሰፈፉ

    // ── Plants & Flowers (3) ──
    '28b62701-e916-4036-ba06-1d21c15925b9': PLANT_SCHEMA, // Edible & Medicinal
    'e52044e6-f783-476a-8415-c98d307a0150': PLANT_SCHEMA, // Indoor
    'f26383ca-5757-4129-aa8e-f54d7f15bf58': PLANT_SCHEMA, // Outdoor

    // ── Garden & Decore (3) ──
    '0ba018fb-911b-4697-93aa-0f5a2e1ba8f1': PLANT_SCHEMA, // Garden Decor
    '92246be4-9e2d-4b05-b52e-0cb9e0720806': PLANT_SCHEMA, // Pots & Containers
    'ef079444-1374-4f36-ba41-b62fe15cb707': PLANT_SCHEMA, // Gardening Essentials

    // ── Bouquet Flowers (6) ──
    '01405f02-99c4-408c-aad7-69664bdba85a': BOUQUET_SCHEMA, // Romantic
    '2353eb77-36c3-4dd8-8d62-400344adc481': BOUQUET_SCHEMA, // Gratitude
    '2abd8208-dcdc-4c20-b6de-22128980cd4b': BOUQUET_SCHEMA, // Florist's Choice
    '5eef076c-c85c-482d-94cb-31b84d0a6631': BOUQUET_SCHEMA, // Celebration
    'c3da870d-06ea-4b51-841d-187c7d31de74': BOUQUET_SCHEMA, // Mini
    'ea252189-9958-428e-888e-03de53c91f23': BOUQUET_SCHEMA, // Fresh Garden Mix

    // ── Hardware, Tools & Safety Gear (3) — NEW ──
    '03c95121-f3e5-495f-b935-67fb1beb9428': SAFETY_GEAR_SCHEMA,
    '5eda90b5-0752-4dfd-a7ef-e9da82c755f8': HAND_TOOLS_SCHEMA,
    'e20c2226-1da5-43e6-98ef-0b14903cbc36': CONSTRUCTION_CHEMICALS_SCHEMA,

    // ── Electrical Installation (5) — NEW ──
    '29740db7-045e-40b2-9028-30777274ab55': DIST_BOARDS_SCHEMA,
    '496f2541-622d-4709-9c10-b41b1df5d69f': CONDUITS_SCHEMA,
    '6ee91557-9822-41fe-961e-0f44c9885b58': SWITCHES_SOCKETS_SCHEMA,
    'a945eee6-96cb-4d7c-967e-774cd47fbf2a': CABLES_WIRES_SCHEMA,
    'e20ae833-c54e-47e2-bb0a-9644cf81270a': LIGHT_BULBS_SCHEMA,

    // ── Plumbing & Sanitary Ware (4) — NEW ──
    '2dcdea8b-c144-48ea-8b60-3f4c05cf81d7': FAUCETS_VALVES_SCHEMA,
    '4efe3fa1-0bd7-42ce-a93b-f0c27015069b': WATER_TANKS_SCHEMA,
    '5beec4ed-3ae2-4e66-a58a-4f1015232389': SANITARY_WARE_SCHEMA,
    'e69b1c5e-6d46-4bc6-928f-55479423221b': PIPES_FITTINGS_SCHEMA,

    // ── Finishing & Finishing Materials (4) — NEW ──
    '08479172-a608-4e69-960c-20a03175f7fd': TILES_SCHEMA,
    '92c0cc0d-6dcb-4aea-961c-8126e9ab6e8b': PAINTS_SCHEMA,
    'ccd5aa9d-1d84-42eb-96e5-c2d6d74b4c32': GYPSUM_SCHEMA,
    'dafa2980-2e60-4707-9b2c-8af503461ae6': MARBLE_GRANITE_SCHEMA,

    // ── Bricks & Blocks (3) — NEW ──
    '20a662d5-382e-489d-a86d-a8437a1a3b6e': CONCRETE_BLOCKS_SCHEMA,
    '271ccd1a-630d-4668-9d16-08c523ff48d7': CLAY_BRICKS_SCHEMA,
    'c579dc88-e3df-43e6-ac5c-21c8f208a542': PAVING_BLOCKS_SCHEMA,

    // ── Aggregates & Stone Products (4) — NEW ──
    '39fe2bb5-1189-4e6e-b553-82d48965bad0': AGGREGATE_SCHEMA,
    '556e4d5d-766a-4b11-953d-192504f2abd3': RED_ASH_SCHEMA,
    '5c20d59e-5291-4065-862d-d0600f28c632': STONE_BLOCKS_SCHEMA,
    '5ff66556-fbe6-46e7-a011-d52d3b9fd09a': RIVER_SAND_SCHEMA,

    // ── Reinforcement Steel & Metals (5) — NEW ──
    '2bcac24f-5956-42b1-a6b8-4fc0187044d0': REBAR_SCHEMA, // Local Rebars
    '33f5a45e-e86c-4c46-a011-933e8d86262e': HOLLOW_SECTIONS_SCHEMA,
    '344ab0ca-bfed-4a45-8ee6-78b3e7a93b77': WIRE_NAILS_SCHEMA,
    '5f38bf7b-9ce0-44a6-83c0-043fb3d17189': IRON_SHEETS_SCHEMA,
    'd8ad5201-d8aa-43a7-bf63-557df76fb9ce': REBAR_SCHEMA, // Imported Rebars

    // ── Cement (3) — NEW ──
    '0727dde1-66f0-4d46-83b4-2e9e941360e9': CEMENT_SCHEMA, // OPC
    '510d72e0-02c7-47bd-b79d-2fd864540ecb': CEMENT_SCHEMA, // PPC
    'df6ce0cd-5e9f-46f7-bc24-e84fd33f244d': CEMENT_SCHEMA, // Finishing/White
};

// ─── HTTP helpers ───────────────────────────────────────────────────────
const apiGet = async (path) => {
    const res = await fetch(`${PROD_BASE}${path}`, { headers: { 'Accept': 'application/json' } });
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : null; } catch { throw new Error(`Non-JSON: ${text.slice(0, 200)}`); }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${json?.message || text.slice(0, 200)}`);
    return json;
};

const apiPut = async (path, body, token) => {
    const res = await fetch(`${PROD_BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : null; } catch { throw new Error(`Non-JSON: ${text.slice(0, 200)}`); }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${json?.message || text.slice(0, 200)}`);
    return json;
};

// ─── Main ───────────────────────────────────────────────────────────────
(async () => {
    try {
        // 1. Login as admin
        console.log('Logging in as admin...');
        const loginResp = await apiGet('/auth/admin/login').catch(() => null) || await fetch(`${PROD_BASE}/auth/admin/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        }).then(r => r.json());

        const token = loginResp?.data?.token;
        if (!token) {
            console.error('Failed to get admin token:', JSON.stringify(loginResp));
            process.exit(1);
        }
        console.log('✓ Admin logged in\n');

        // 2. Fetch all subcategories to get names for logging
        console.log('Fetching categories...');
        const catsResp = await apiGet('/categories');
        const categories = catsResp?.data?.categories || catsResp?.categories || [];
        const subcatNames = {};
        for (const cat of categories) {
            for (const sub of (cat.subcategories || [])) {
                subcatNames[sub.sub_cat_id] = `${cat.name} > ${sub.name}`;
            }
        }
        console.log(`✓ Found ${Object.keys(subcatNames).length} subcategories\n`);

        // 3. Update each schema
        let success = 0, failed = 0, skipped = 0;
        const ids = Object.keys(SCHEMAS);

        console.log(`Updating ${ids.length} subcategory schemas...\n`);
        console.log('='.repeat(90));

        for (const subCatId of ids) {
            const schema = SCHEMAS[subCatId];
            const name = subcatNames[subCatId] || '(unknown)';
            const fieldCount = schema.length;

            try {
                const resp = await apiPut(`/categories/subcategories/${subCatId}/schema`, { schema }, token);
                if (resp?.success !== false) {
                    console.log(`✓ ${name}  [${fieldCount} fields]  — updated`);
                    success++;
                } else {
                    console.log(`✗ ${name}  — ${resp?.message || 'unknown error'}`);
                    failed++;
                }
            } catch (e) {
                console.log(`✗ ${name}  — ${e.message}`);
                failed++;
            }
        }

        console.log('='.repeat(90));
        console.log(`\nDONE`);
        console.log(`  Updated : ${success}`);
        console.log(`  Failed  : ${failed}`);
        console.log(`  Total   : ${ids.length}`);
    } catch (err) {
        console.error('Fatal error:', err.message);
        console.error(err.stack);
        process.exitCode = 1;
    }
})();
