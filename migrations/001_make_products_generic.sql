-- Product Schema Migration SQL
-- This migration updates the products table from livestock-specific to generic/industry-agnostic

-- Step 1: Modify product_type column from ENUM to VARCHAR
ALTER TABLE products 
MODIFY COLUMN product_type VARCHAR(50) 
COMMENT 'Type/category of product (e.g., livestock, electronics, clothing, services, etc.)';

-- Step 2: Add new generic product specification columns
ALTER TABLE products
ADD COLUMN weight DECIMAL(10, 2) NULL COMMENT 'Product weight (unit specified in weight_unit)' AFTER minimum_order_quantity,
ADD COLUMN weight_unit VARCHAR(10) DEFAULT 'kg' COMMENT 'Unit of weight measurement (kg, g, lbs, etc.)' AFTER weight,
ADD COLUMN dimensions JSON NULL COMMENT 'Product dimensions {length, width, height, unit}' AFTER weight_unit,
ADD COLUMN color VARCHAR(100) NULL COMMENT 'Primary color or color variations' AFTER dimensions,
ADD COLUMN size VARCHAR(50) NULL COMMENT 'Size specification (S, M, L, XL, or custom)' AFTER color,
ADD COLUMN material VARCHAR(255) NULL COMMENT 'Material composition or construction' AFTER size,
ADD COLUMN brand VARCHAR(100) NULL COMMENT 'Brand name or manufacturer' AFTER material,
ADD COLUMN model_number VARCHAR(100) NULL COMMENT 'Model or version number' AFTER brand,
ADD COLUMN condition ENUM('new', 'like_new', 'good', 'fair', 'poor', 'refurbished') DEFAULT 'new' COMMENT 'Product condition' AFTER model_number,
ADD COLUMN warranty_info TEXT NULL COMMENT 'Warranty details and coverage information' AFTER condition,
ADD COLUMN manufacture_date DATE NULL COMMENT 'Date of manufacture or production' AFTER warranty_info,
ADD COLUMN expiry_date DATE NULL COMMENT 'Expiration date (for perishable goods, medications, etc.)' AFTER manufacture_date;

-- Step 3: Update metadata column comment to document its purpose
ALTER TABLE products
MODIFY COLUMN metadata JSON NULL COMMENT 'Industry-specific attributes stored as flexible JSON. Examples:
- Livestock: {breed, age_months, gender, health_status, vaccination_records, genetic_traits, milk_production, breeding_history, etc.}
- Electronics: {processor, ram, storage, screen_size, battery_life, operating_system, etc.}
- Clothing: {fabric_type, care_instructions, fit_type, season, style, etc.}
- Food: {ingredients, nutritional_info, allergens, storage_instructions, etc.}
- Services: {duration, skill_level, requirements, included_items, etc.}';

-- Step 4: (OPTIONAL - RECOMMENDED FOR PRODUCTION) 
-- Migrate existing livestock data to metadata field
-- Uncomment the following if you want to move livestock-specific data into metadata:

/*
UPDATE products
SET metadata = JSON_SET(
    COALESCE(metadata, '{}'),
    '$.breed', breed,
    '$.age_months', age_months,
    '$.date_of_birth', date_of_birth,
    '$.gender', gender,
    '$.health_status', health_status,
    '$.vaccination_records', vaccination_records,
    '$.medical_history', medical_history,
    '$.veterinary_certificates', veterinary_certificates,
    '$.last_health_checkup', last_health_checkup,
    '$.genetic_traits', genetic_traits,
    '$.milk_production_liters_per_day', milk_production_liters_per_day,
    '$.breeding_history', breeding_history,
    '$.offspring_count', offspring_count
)
WHERE product_type = 'livestock'
AND (
    breed IS NOT NULL OR
    age_months IS NOT NULL OR
    date_of_birth IS NOT NULL OR
    gender IS NOT NULL OR
    health_status IS NOT NULL OR
    vaccination_records IS NOT NULL OR
    medical_history IS NOT NULL OR
    veterinary_certificates IS NOT NULL OR
    last_health_checkup IS NOT NULL OR
    genetic_traits IS NOT NULL OR
    milk_production_liters_per_day IS NOT NULL OR
    breeding_history IS NOT NULL OR
    offspring_count IS NOT NULL
);

-- Copy weight_kg and height_cm to new weight field for livestock
UPDATE products
SET 
    weight = weight_kg,
    weight_unit = 'kg'
WHERE weight_kg IS NOT NULL AND product_type = 'livestock';

-- Store height in metadata for livestock
UPDATE products
SET metadata = JSON_SET(
    COALESCE(metadata, '{}'),
    '$.height_cm', height_cm
)
WHERE height_cm IS NOT NULL AND product_type = 'livestock';

-- Store color_markings in the new color field and metadata
UPDATE products
SET 
    color = color_markings,
    metadata = JSON_SET(COALESCE(metadata, '{}'), '$.color_markings', color_markings)
WHERE color_markings IS NOT NULL AND product_type = 'livestock';
*/

-- Step 5: (OPTIONAL - ONLY AFTER DATA MIGRATION IS COMPLETE)
-- Drop old livestock-specific columns
-- WARNING: Only run this after confirming data migration is successful!

/*
ALTER TABLE products
DROP COLUMN breed,
DROP COLUMN age_months,
DROP COLUMN date_of_birth,
DROP COLUMN gender,
DROP COLUMN weight_kg,
DROP COLUMN height_cm,
DROP COLUMN color_markings,
DROP COLUMN mother_id,
DROP COLUMN father_id,
DROP COLUMN health_status,
DROP COLUMN vaccination_records,
DROP COLUMN medical_history,
DROP COLUMN veterinary_certificates,
DROP COLUMN last_health_checkup,
DROP COLUMN genetic_traits,
DROP COLUMN milk_production_liters_per_day,
DROP COLUMN breeding_history,
DROP COLUMN offspring_count;
*/

-- Note: The old columns are kept for backward compatibility.
-- You can run the data migration and column removal later when ready.
