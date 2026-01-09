# Product Schema Migration Guide

## Overview
The Product schema has been refactored from a **livestock-specific** model to a **generic, industry-agnostic** schema that can handle any type of product (electronics, clothing, food, services, livestock, etc.).

## Key Changes

### 1. **Product Type Field**
- **Before:** ENUM with fixed values `['livestock', 'feed', 'equipment', 'service', 'other']`
- **After:** String field (VARCHAR 50) that accepts any product type
- **Example values:** `'livestock'`, `'electronics'`, `'clothing'`, `'food'`, `'services'`, `'books'`, `'furniture'`, etc.

### 2. **Removed Livestock-Specific Fields**
The following fields have been **removed** from the main schema:
- `breed` (was: STRING 100)
- `age_months` (was: INTEGER)
- `date_of_birth` (was: DATEONLY)
- `gender` (was: ENUM 'male'/'female')
- `weight_kg` (was: DECIMAL)
- `height_cm` (was: DECIMAL)
- `color_markings` (was: STRING 255)
- `mother_id` (was: UUID reference)
- `father_id` (was: UUID reference)
- `health_status` (was: ENUM)
- `vaccination_records` (was: JSON array)
- `medical_history` (was: TEXT)
- `veterinary_certificates` (was: JSON array)
- `last_health_checkup` (was: DATE)
- `genetic_traits` (was: TEXT)
- `milk_production_liters_per_day` (was: DECIMAL)
- `breeding_history` (was: TEXT)
- `offspring_count` (was: INTEGER)

### 3. **New Generic Product Fields**
Added flexible fields that work for **any** product type:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `weight` | DECIMAL(10,2) | Product weight | `2.5`, `150.00` |
| `weight_unit` | STRING(10) | Weight measurement unit | `'kg'`, `'lbs'`, `'g'` |
| `dimensions` | JSON | Product dimensions | `{length: 30, width: 20, height: 10, unit: 'cm'}` |
| `color` | STRING(100) | Primary color or variations | `'Red'`, `'Blue/White'`, `'Black'` |
| `size` | STRING(50) | Size specification | `'M'`, `'XL'`, `'42'`, `'10.5'` |
| `material` | STRING(255) | Material composition | `'Cotton'`, `'Stainless Steel'`, `'Plastic'` |
| `brand` | STRING(100) | Brand name or manufacturer | `'Samsung'`, `'Nike'`, `'Local Farm'` |
| `model_number` | STRING(100) | Model or version number | `'iPhone 15 Pro'`, `'V2.0'` |
| `condition` | ENUM | Product condition | `'new'`, `'like_new'`, `'good'`, `'fair'`, `'poor'`, `'refurbished'` |
| `warranty_info` | TEXT | Warranty details | `'2-year manufacturer warranty'` |
| `manufacture_date` | DATEONLY | Date of manufacture | `'2024-01-15'` |
| `expiry_date` | DATEONLY | Expiration date (perishables) | `'2025-12-31'` |

### 4. **Using the Metadata Field for Industry-Specific Data**
All industry-specific attributes should now be stored in the `metadata` JSON field. This provides **maximum flexibility** without database schema changes.

#### Example: Livestock Product
```json
{
  "name": "Holstein Dairy Cow",
  "product_type": "livestock",
  "price": 50000,
  "weight": 600,
  "weight_unit": "kg",
  "metadata": {
    "breed": "Holstein",
    "age_months": 24,
    "date_of_birth": "2022-12-01",
    "gender": "female",
    "health_status": "excellent",
    "vaccination_records": [
      { "vaccine": "FMD", "date": "2024-06-01" },
      { "vaccine": "Brucellosis", "date": "2024-03-15" }
    ],
    "milk_production_liters_per_day": 25,
    "breeding_history": "Calved twice, both healthy offspring",
    "genetic_traits": "High milk production lineage"
  }
}
```

#### Example: Electronics Product
```json
{
  "name": "Samsung Galaxy S24 Ultra",
  "product_type": "electronics",
  "price": 45000,
  "brand": "Samsung",
  "model_number": "SM-S928",
  "condition": "new",
  "warranty_info": "1 year manufacturer warranty",
  "manufacture_date": "2024-02-01",
  "metadata": {
    "processor": "Snapdragon 8 Gen 3",
    "ram": "12GB",
    "storage": "512GB",
    "screen_size": "6.8 inches",
    "battery_capacity": "5000mAh",
    "operating_system": "Android 14",
    "camera": "200MP main, 12MP ultrawide, 10MP telephoto",
    "5g_enabled": true
  }
}
```

#### Example: Clothing Product
```json
{
  "name": "Men's Cotton T-Shirt",
  "product_type": "clothing",
  "price": 500,
  "brand": "Local Brand",
  "size": "L",
  "color": "Navy Blue",
  "material": "100% Cotton",
  "condition": "new",
  "metadata": {
    "fabric_type": "Combed cotton",
    "care_instructions": "Machine wash cold, tumble dry low",
    "fit_type": "Regular fit",
    "season": "All season",
    "style": "Crew neck, short sleeve",
    "made_in": "Ethiopia"
  }
}
```

#### Example: Food Product
```json
{
  "name": "Organic Honey",
  "product_type": "food",
  "price": 800,
  "weight": 500,
  "weight_unit": "g",
  "condition": "new",
  "manufacture_date": "2024-10-01",
  "expiry_date": "2026-10-01",
  "metadata": {
    "ingredients": ["Pure organic honey"],
    "nutritional_info": {
      "calories": 304,
      "carbohydrates": "82g",
      "sugars": "82g"
    },
    "allergens": [],
    "storage_instructions": "Store in a cool, dry place",
    "certified_organic": true,
    "origin": "Ethiopian highlands"
  }
}
```

## Migration Steps

### For Existing Livestock Products
If you have existing livestock products in your database, you'll need to migrate them:

1. **No immediate action required** - The existing fields still exist for backward compatibility
2. **Recommended:** Gradually migrate livestock-specific data to the `metadata` field
3. **Future:** Consider dropping the old columns after migration is complete

### For New Products (Any Type)
1. Set the `product_type` to your industry (e.g., `'electronics'`, `'clothing'`, `'food'`)
2. Fill in the generic fields that apply (`weight`, `dimensions`, `color`, `size`, `brand`, etc.)
3. Store industry-specific attributes in the `metadata` field as JSON
4. Use the `tags` field for searchability

## API Usage Examples

### Creating a New Product (Electronics)
```javascript
POST /api/products
Content-Type: application/json

{
  "name": "Apple MacBook Pro 16\"",
  "product_type": "electronics",
  "sub_cat_id": "uuid-of-laptops-subcategory",
  "description": "Powerful laptop for professionals",
  "price": 250000,
  "currency": "ETB",
  "stock_quantity": 5,
  "brand": "Apple",
  "model_number": "MacBook Pro 16\" M3 Max",
  "condition": "new",
  "weight": 2.15,
  "weight_unit": "kg",
  "dimensions": {
    "length": 35.57,
    "width": 24.81,
    "height": 1.68,
    "unit": "cm"
  },
  "warranty_info": "1 year AppleCare warranty",
  "manufacture_date": "2024-11-01",
  "metadata": {
    "processor": "Apple M3 Max",
    "ram": "36GB",
    "storage": "1TB SSD",
    "screen_size": "16.2 inches",
    "resolution": "3456 x 2234",
    "graphics": "M3 Max 40-core GPU",
    "ports": ["3x Thunderbolt 4", "HDMI", "SD card slot", "MagSafe 3"],
    "battery_life": "22 hours"
  },
  "tags": ["laptop", "apple", "macbook", "professional", "m3"],
  "image_urls": ["https://example.com/macbook-1.jpg"],
  "location": "Addis Ababa",
  "shipping_available": true
}
```

### Searching for Products
The generic schema makes it easier to search across all product types:

```javascript
// Search all electronics by brand
GET /api/products?product_type=electronics&brand=Samsung

// Search all products by condition
GET /api/products?condition=new

// Search by size (works for clothing, shoes, etc.)
GET /api/products?size=L

// Search by weight range
GET /api/products?weight_min=1&weight_max=5&weight_unit=kg
```

## Benefits of the New Schema

1. ✅ **Industry Agnostic** - Can handle any product type without schema changes
2. ✅ **Flexible** - Add new product types without database migrations
3. ✅ **Scalable** - Metadata field allows unlimited custom attributes
4. ✅ **Generic Fields** - Common attributes (weight, size, color, brand) work across industries
5. ✅ **Backward Compatible** - Existing livestock products continue to work
6. ✅ **Searchable** - Generic fields enable cross-category searches
7. ✅ **Future Proof** - Easy to add new industries without code changes

## Notes

- The `metadata` field is **schemaless** - each product type can have completely different metadata structure
- Use the `tags` array for searchability and categorization
- The `product_type` field helps filter and group products by industry
- Consider creating industry-specific helper functions in your frontend to display metadata appropriately
