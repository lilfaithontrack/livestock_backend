/**
 * Default metadata schemas for product subcategories.
 * Each schema defines the dynamic form fields that appear
 * when creating/editing a product in that subcategory.
 *
 * Field definition:
 *   key          – stored in product.metadata[key]
 *   label        – display label
 *   type         – text | number | select | textarea | date | checkbox
 *   placeholder  – input placeholder
 *   required     – whether the field is mandatory
 *   options      – array of {value, label} for select fields
 *   group        – visual grouping label
 *   suffix       – unit suffix shown after input (e.g. "kg")
 */

const SCHEMAS = {
    // ─── LIVESTOCK ───
    cattle: [
        { key: 'breed', label: 'Breed', type: 'text', placeholder: 'e.g. Holstein, Boran', group: 'Animal Info' },
        { key: 'gender', label: 'Gender', type: 'select', options: [{ value: 'male', label: '♂ Male' }, { value: 'female', label: '♀ Female' }], group: 'Animal Info' },
        { key: 'age_months', label: 'Age (months)', type: 'number', placeholder: '0', group: 'Animal Info' },
        { key: 'date_of_birth', label: 'Date of Birth', type: 'date', group: 'Animal Info' },
        { key: 'weight_kg', label: 'Weight', type: 'number', placeholder: '0', suffix: 'kg', group: 'Animal Info' },
        { key: 'height_cm', label: 'Height', type: 'number', placeholder: '0', suffix: 'cm', group: 'Animal Info' },
        { key: 'color_markings', label: 'Color & Markings', type: 'text', placeholder: 'Describe distinctive features', group: 'Animal Info' },
        { key: 'health_status', label: 'Health Status', type: 'select', options: [{ value: 'excellent', label: '💚 Excellent' }, { value: 'good', label: '💙 Good' }, { value: 'fair', label: '💛 Fair' }, { value: 'poor', label: '❤️ Poor' }, { value: 'unknown', label: '⚪ Unknown' }], group: 'Health' },
        { key: 'medical_history', label: 'Medical History', type: 'textarea', placeholder: 'Any medical notes...', group: 'Health' },
        { key: 'last_health_checkup', label: 'Last Health Checkup', type: 'date', group: 'Health' },
        { key: 'milk_production_liters_per_day', label: 'Milk Production', type: 'number', placeholder: '0', suffix: 'L/day', group: 'Performance' },
        { key: 'genetic_traits', label: 'Genetic Traits', type: 'textarea', placeholder: 'Genetic characteristics...', group: 'Performance' },
        { key: 'breeding_history', label: 'Breeding History', type: 'textarea', placeholder: 'Breeding notes...', group: 'Performance' },
        { key: 'offspring_count', label: 'Offspring Count', type: 'number', placeholder: '0', group: 'Performance' },
    ],
    'sheep-goats': [
        { key: 'breed', label: 'Breed', type: 'text', placeholder: 'e.g. Boer, Dorper', group: 'Animal Info' },
        { key: 'gender', label: 'Gender', type: 'select', options: [{ value: 'male', label: '♂ Male' }, { value: 'female', label: '♀ Female' }], group: 'Animal Info' },
        { key: 'age_months', label: 'Age (months)', type: 'number', placeholder: '0', group: 'Animal Info' },
        { key: 'weight_kg', label: 'Weight', type: 'number', placeholder: '0', suffix: 'kg', group: 'Animal Info' },
        { key: 'color_markings', label: 'Color & Markings', type: 'text', placeholder: 'Describe features', group: 'Animal Info' },
        { key: 'health_status', label: 'Health Status', type: 'select', options: [{ value: 'excellent', label: '💚 Excellent' }, { value: 'good', label: '💙 Good' }, { value: 'fair', label: '💛 Fair' }, { value: 'poor', label: '❤️ Poor' }, { value: 'unknown', label: '⚪ Unknown' }], group: 'Health' },
        { key: 'medical_history', label: 'Medical History', type: 'textarea', placeholder: 'Any medical notes...', group: 'Health' },
    ],

    // ─── ELECTRONICS ───
    'mobile-phones': [
        { key: 'processor', label: 'Processor', type: 'text', placeholder: 'e.g. Snapdragon 8 Gen 3', group: 'Specifications' },
        { key: 'ram', label: 'RAM', type: 'text', placeholder: 'e.g. 8GB', group: 'Specifications' },
        { key: 'storage', label: 'Storage', type: 'text', placeholder: 'e.g. 256GB', group: 'Specifications' },
        { key: 'screen_size', label: 'Screen Size', type: 'text', placeholder: 'e.g. 6.7 inches', group: 'Specifications' },
        { key: 'battery_capacity', label: 'Battery Capacity', type: 'text', placeholder: 'e.g. 5000mAh', group: 'Specifications' },
        { key: 'operating_system', label: 'Operating System', type: 'text', placeholder: 'e.g. Android 14', group: 'Specifications' },
        { key: 'camera', label: 'Camera', type: 'text', placeholder: 'e.g. 200MP main + 12MP ultrawide', group: 'Specifications' },
        { key: 'resolution', label: 'Display Resolution', type: 'text', placeholder: 'e.g. 2560x1440', group: 'Specifications' },
        { key: 'sim_type', label: 'SIM Type', type: 'select', options: [{ value: 'single', label: 'Single SIM' }, { value: 'dual', label: 'Dual SIM' }, { value: 'esim', label: 'eSIM' }], group: 'Connectivity' },
        { key: '5g_enabled', label: '5G Enabled', type: 'checkbox', group: 'Connectivity' },
    ],
    laptops: [
        { key: 'processor', label: 'Processor', type: 'text', placeholder: 'e.g. Apple M3 Max, Intel i7', group: 'Specifications' },
        { key: 'ram', label: 'RAM', type: 'text', placeholder: 'e.g. 16GB', group: 'Specifications' },
        { key: 'storage', label: 'Storage', type: 'text', placeholder: 'e.g. 512GB SSD', group: 'Specifications' },
        { key: 'screen_size', label: 'Screen Size', type: 'text', placeholder: 'e.g. 15.6 inches', group: 'Specifications' },
        { key: 'resolution', label: 'Display Resolution', type: 'text', placeholder: 'e.g. 2560x1600', group: 'Specifications' },
        { key: 'graphics', label: 'Graphics Card', type: 'text', placeholder: 'e.g. NVIDIA RTX 4060', group: 'Specifications' },
        { key: 'battery_life', label: 'Battery Life', type: 'text', placeholder: 'e.g. 10 hours', group: 'Specifications' },
        { key: 'operating_system', label: 'Operating System', type: 'text', placeholder: 'e.g. Windows 11, macOS', group: 'Specifications' },
        { key: 'ports', label: 'Ports & Connectivity', type: 'text', placeholder: 'e.g. USB-C, HDMI, WiFi 6', group: 'Connectivity' },
    ],

    // ─── CLOTHING ───
    'mens-wear': [
        { key: 'fabric_type', label: 'Fabric Type', type: 'text', placeholder: 'e.g. Combed Cotton, Denim', group: 'Material' },
        { key: 'fit_type', label: 'Fit Type', type: 'select', options: [{ value: 'slim', label: 'Slim Fit' }, { value: 'regular', label: 'Regular Fit' }, { value: 'loose', label: 'Loose Fit' }, { value: 'oversized', label: 'Oversized' }], group: 'Material' },
        { key: 'collar_type', label: 'Collar / Neckline', type: 'text', placeholder: 'e.g. V-Neck, Crew Neck', group: 'Style' },
        { key: 'season', label: 'Season', type: 'select', options: [{ value: 'all', label: 'All Season' }, { value: 'summer', label: 'Summer' }, { value: 'winter', label: 'Winter' }, { value: 'spring', label: 'Spring/Autumn' }], group: 'Style' },
        { key: 'care_instructions', label: 'Care Instructions', type: 'textarea', placeholder: 'e.g. Machine wash cold, tumble dry low', group: 'Care' },
        { key: 'made_in', label: 'Made In', type: 'text', placeholder: 'e.g. Ethiopia', group: 'Care' },
    ],
    'womens-wear': [
        { key: 'fabric_type', label: 'Fabric Type', type: 'text', placeholder: 'e.g. Silk, Chiffon, Cotton', group: 'Material' },
        { key: 'fit_type', label: 'Fit Type', type: 'select', options: [{ value: 'slim', label: 'Slim Fit' }, { value: 'regular', label: 'Regular Fit' }, { value: 'loose', label: 'Loose Fit' }, { value: 'bodycon', label: 'Bodycon' }], group: 'Material' },
        { key: 'style', label: 'Style', type: 'text', placeholder: 'e.g. Casual, Formal, Traditional', group: 'Style' },
        { key: 'season', label: 'Season', type: 'select', options: [{ value: 'all', label: 'All Season' }, { value: 'summer', label: 'Summer' }, { value: 'winter', label: 'Winter' }, { value: 'spring', label: 'Spring/Autumn' }], group: 'Style' },
        { key: 'care_instructions', label: 'Care Instructions', type: 'textarea', placeholder: 'e.g. Hand wash only', group: 'Care' },
        { key: 'made_in', label: 'Made In', type: 'text', placeholder: 'e.g. Ethiopia', group: 'Care' },
    ],

    // ─── FURNITURE ───
    'living-room': [
        { key: 'wood_type', label: 'Wood / Material Type', type: 'text', placeholder: 'e.g. Oak, Teak, MDF', group: 'Construction' },
        { key: 'finish_type', label: 'Finish', type: 'select', options: [{ value: 'polished', label: 'Polished' }, { value: 'matte', label: 'Matte' }, { value: 'varnished', label: 'Varnished' }, { value: 'painted', label: 'Painted' }, { value: 'natural', label: 'Natural' }], group: 'Construction' },
        { key: 'seat_count', label: 'Seat Count', type: 'number', placeholder: 'e.g. 3', group: 'Dimensions' },
        { key: 'weight_capacity', label: 'Weight Capacity', type: 'text', placeholder: 'e.g. 150kg', group: 'Dimensions' },
        { key: 'assembly_required', label: 'Assembly Required', type: 'checkbox', group: 'Details' },
        { key: 'style_type', label: 'Style', type: 'select', options: [{ value: 'modern', label: 'Modern' }, { value: 'traditional', label: 'Traditional' }, { value: 'vintage', label: 'Vintage' }, { value: 'industrial', label: 'Industrial' }, { value: 'minimalist', label: 'Minimalist' }], group: 'Details' },
    ],
    bedroom: [
        { key: 'wood_type', label: 'Wood / Material Type', type: 'text', placeholder: 'e.g. Mahogany, Pine', group: 'Construction' },
        { key: 'finish_type', label: 'Finish', type: 'select', options: [{ value: 'polished', label: 'Polished' }, { value: 'matte', label: 'Matte' }, { value: 'varnished', label: 'Varnished' }, { value: 'painted', label: 'Painted' }], group: 'Construction' },
        { key: 'bed_size', label: 'Bed Size', type: 'select', options: [{ value: 'single', label: 'Single' }, { value: 'double', label: 'Double' }, { value: 'queen', label: 'Queen' }, { value: 'king', label: 'King' }], group: 'Dimensions' },
        { key: 'weight_capacity', label: 'Weight Capacity', type: 'text', placeholder: 'e.g. 200kg', group: 'Dimensions' },
        { key: 'assembly_required', label: 'Assembly Required', type: 'checkbox', group: 'Details' },
        { key: 'style_type', label: 'Style', type: 'select', options: [{ value: 'modern', label: 'Modern' }, { value: 'traditional', label: 'Traditional' }, { value: 'vintage', label: 'Vintage' }], group: 'Details' },
    ],
    office: [
        { key: 'wood_type', label: 'Material Type', type: 'text', placeholder: 'e.g. Steel, Engineered Wood', group: 'Construction' },
        { key: 'finish_type', label: 'Finish', type: 'select', options: [{ value: 'polished', label: 'Polished' }, { value: 'matte', label: 'Matte' }, { value: 'laminated', label: 'Laminated' }], group: 'Construction' },
        { key: 'adjustable', label: 'Adjustable Height', type: 'checkbox', group: 'Features' },
        { key: 'ergonomic', label: 'Ergonomic Design', type: 'checkbox', group: 'Features' },
        { key: 'weight_capacity', label: 'Weight Capacity', type: 'text', placeholder: 'e.g. 120kg', group: 'Dimensions' },
        { key: 'assembly_required', label: 'Assembly Required', type: 'checkbox', group: 'Details' },
    ],

    // ─── FOOD & BEVERAGES ───
    'honey-natural': [
        { key: 'ingredients', label: 'Ingredients', type: 'text', placeholder: 'e.g. Pure organic honey', group: 'Nutrition' },
        { key: 'calories_per_100g', label: 'Calories per 100g', type: 'number', placeholder: '0', group: 'Nutrition' },
        { key: 'allergens', label: 'Allergens', type: 'text', placeholder: 'e.g. None', group: 'Nutrition' },
        { key: 'storage_instructions', label: 'Storage Instructions', type: 'textarea', placeholder: 'e.g. Store in cool dry place', group: 'Storage' },
        { key: 'certified_organic', label: 'Certified Organic', type: 'checkbox', group: 'Certification' },
        { key: 'origin', label: 'Origin', type: 'text', placeholder: 'e.g. Ethiopian Highlands', group: 'Certification' },
    ],
};

/**
 * Get schema for a subcategory by slug.
 * Falls back to null if no schema is defined.
 */
function getSchemaBySlug(slug) {
    return SCHEMAS[slug] || null;
}

/**
 * Get all available schema slugs.
 */
function getAvailableSlugs() {
    return Object.keys(SCHEMAS);
}

module.exports = { SCHEMAS, getSchemaBySlug, getAvailableSlugs };
