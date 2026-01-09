# Ethio Livestock API - Frontend Integration Guide

## Overview
This document provides complete schema documentation for the Ethio Livestock Development Platform backend API. Use this guide to build frontend forms, interfaces, and API integrations.

**Base URL:** `http://localhost:5000/api/v1`

---

## Table of Contents
1. [Product Schema](#product-schema)
2. [Currency Schema](#currency-schema)
3. [Category & Subcategory Schemas](#category--subcategory-schemas)
4. [User Schema](#user-schema)
5. [Order Schema](#order-schema)
6. [API Endpoints](#api-endpoints)
7. [Validation Rules](#validation-rules)

---

## Product Schema

### Fields Overview (50+ fields)

#### **Basic Information**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `product_id` | UUID | Auto | - | Primary key |
| `sku` | String(50) | Auto | - | Auto-generated unique code (e.g., LVS-20251219-A3D2F) |
| `name` | String(255) | ✅ | - | Product name |
| `description` | Text | ❌ | null | Detailed description |
| `product_type` | Enum | ❌ | 'livestock' | Type: livestock, feed, equipment, service, other |
| `sub_cat_id` | UUID | ✅ | - | Reference to ProductSubcategory |

#### **Pricing & Inventory**
| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `price` | Decimal(10,2) | ✅ | - | Must be > 0 |
| `deleted_price` | Decimal(10,2) | ❌ | null | Original price before discount |
| `discount_percentage` | Decimal(5,2) | ❌ | 0 | 0-100 |
| `currency_id` | UUID | ❌ | null | Reference to Currency model |
| `currency` | String(3) | ❌ | 'ETB' | Legacy currency code |
| `stock_quantity` | Integer | ❌ | 1 | Available quantity ≥ 0 |
| `minimum_order_quantity` | Integer | ❌ | 1 | Minimum order ≥ 1 |

#### **Livestock Specifications**
| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `breed` | String(100) | ❌ | null | Animal breed |
| `age_months` | Integer | ❌ | null | Age in months (0-300) |
| `date_of_birth` | Date | ❌ | null | Birth date (not future) |
| `gender` | Enum | ❌ | null | male, female |
| `weight_kg` | Decimal(8,2) | ❌ | null | Weight in kg (0-99999) |
| `height_cm` | Decimal(6,2) | ❌ | null | Height in cm (0-9999) |
| `color_markings` | String(255) | ❌ | null | Color and markings |
| `mother_id` | UUID | ❌ | null | Reference to mother product |
| `father_id` | UUID | ❌ | null | Reference to father product |

#### **Health & Medical**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `health_status` | Enum | ❌ | 'unknown' | excellent, good, fair, poor, unknown |
| `vaccination_records` | JSON Array | ❌ | [] | Array of vaccination objects |
| `medical_history` | Text | ❌ | null | Medical history details |
| `veterinary_certificates` | JSON Array | ❌ | [] | URLs to vet certificates |
| `last_health_checkup` | Date | ❌ | null | Last checkup date |

**Vaccination Record Format:**
```json
{
  "vaccine_name": "FMD",
  "date": "2024-12-01",
  "veterinarian": "Dr. Alemayehu",
  "certificate_url": "optional_url"
}
```

#### **Genetics & Performance**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `genetic_traits` | Text | ❌ | null | Notable genetic characteristics |
| `milk_production_liters_per_day` | Decimal(6,2) | ❌ | null | Daily milk production (0-9999) |
| `breeding_history` | Text | ❌ | null | Breeding history |
| `offspring_count` | Integer | ❌ | 0 | Number of offspring |

#### **Location & Logistics**
| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `location` | String(255) | ❌ | null | Text location description |
| `latitude` | Decimal(10,8) | ❌ | null | GPS latitude (-90 to 90) |
| `longitude` | Decimal(11,8) | ❌ | null | GPS longitude (-180 to 180) |
| `shipping_available` | Boolean | ❌ | false | Shipping option available |
| `delivery_timeframe_days` | Integer | ❌ | null | Delivery time in days (0-365) |
| `pickup_available` | Boolean | ❌ | true | Pickup option available |

#### **Certifications & Compliance**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `certificate_urls` | JSON Array | ❌ | [] | Certificate document URLs |
| `license_numbers` | JSON Array | ❌ | [] | License and permit numbers |
| `organic_certified` | Boolean | ❌ | false | Organic certification flag |

#### **Media**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `image_urls` | JSON Array | ❌ | [] | Product image URLs (max 10) |
| `video_urls` | JSON Array | ❌ | [] | Product video URLs |

#### **Marketplace Features**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `featured` | Boolean | ❌ | false | Featured product flag |
| `view_count` | Integer | Auto | 0 | Number of views |
| `rating` | Decimal(3,2) | ❌ | null | Average rating (0-5) |
| `review_count` | Integer | Auto | 0 | Number of reviews |
| `availability_status` | Enum | ❌ | 'available' | available, sold, reserved, pending_sale, unavailable |

#### **Admin & Status**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `seller_id` | UUID | Auto | - | Reference to User (seller) |
| `status` | Enum | Auto | 'Pending' | Pending, Live, Rejected, Archived |
| `admin_approved_by` | UUID | ❌ | null | Reference to admin User |
| `rejection_reason` | Text | ❌ | null | Reason for rejection |
| `approved_at` | DateTime | Auto | null | Approval timestamp |
| `published_at` | DateTime | Auto | null | Publication timestamp |
| `sold_at` | DateTime | Auto | null | Sale timestamp |

#### **Metadata**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `metadata` | JSON Object | ❌ | {} | Additional flexible metadata |
| `tags` | JSON Array | ❌ | [] | Search tags for discoverability |
| `created_at` | DateTime | Auto | - | Creation timestamp |
| `updated_at` | DateTime | Auto | - | Last update timestamp |

---

## Currency Schema

### Fields
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `currency_id` | UUID | Auto | - | Primary key |
| `code` | String(3) | ✅ | - | Currency code (ETB, USD, EUR) **Unique** |
| `name` | String(50) | ✅ | - | Full currency name |
| `symbol` | String(10) | ❌ | null | Currency symbol (ብር, $, €) |
| `exchange_rate_to_usd` | Decimal(10,4) | ✅ | 1.0000 | Exchange rate to USD (> 0.0001) |
| `is_active` | Boolean | ❌ | true | Active flag |
| `is_default` | Boolean | ❌ | false | Default currency flag |
| `decimal_places` | Integer | ❌ | 2 | Decimal places (0-4) |
| `last_updated` | DateTime | ❌ | null | Last rate update |
| `created_at` | DateTime | Auto | - | Creation timestamp |
| `updated_at` | DateTime | Auto | - | Last update timestamp |

### Example Currency Objects
```json
{
  "currency_id": "uuid",
  "code": "ETB",
  "name": "Ethiopian Birr",
  "symbol": "ብር",
  "exchange_rate_to_usd": 0.0180,
  "is_active": true,
  "is_default": true,
  "decimal_places": 2
}
```

---

## Category & Subcategory Schemas

### ProductCategory
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `cat_id` | UUID | Auto | - | Primary key |
| `name` | String(100) | ✅ | - | Category name **Unique** |
| `slug` | String(120) | ❌ | null | SEO-friendly URL slug **Unique** |
| `description` | Text | ❌ | null | Category description |
| `image_url` | String(500) | ❌ | null | Category banner image |
| `icon_url` | String(500) | ❌ | null | Category icon |
| `display_order` | Integer | ❌ | 0 | Display order in UI |
| `is_active` | Boolean | ❌ | true | Active status |
| `metadata` | JSON Object | ❌ | {} | Additional attributes |
| `created_at` | DateTime | Auto | - | Creation timestamp |
| `updated_at` | DateTime | Auto | - | Last update timestamp |

### ProductSubcategory
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sub_cat_id` | UUID | Auto | - | Primary key |
| `cat_id` | UUID | ✅ | - | Reference to ProductCategory |
| `name` | String(100) | ✅ | - | Subcategory name |
| `slug` | String(120) | ❌ | null | SEO-friendly URL slug **Unique** |
| `description` | Text | ❌ | null | Subcategory description |
| `image_url` | String(500) | ❌ | null | Subcategory image |
| `display_order` | Integer | ❌ | 0 | Display order |
| `is_active` | Boolean | ❌ | true | Active status |
| `metadata` | JSON Object | ❌ | {} | Filter attributes |
| `created_at` | DateTime | Auto | - | Creation timestamp |
| `updated_at` | DateTime | Auto | - | Last update timestamp |

---

## User Schema

### Fields (Simplified for reference)
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | UUID | Primary key |
| `phone` | String(15) | Phone number |
| `email` | String | Email address |
| `password_hash` | String | Hashed password |
| `role` | Enum | Buyer, Seller, Agent, Admin |
| `kyc_status` | Boolean | KYC verification status |
| `address` | Text | Physical address |
| `created_at` | DateTime | Registration date |
| `updated_at` | DateTime | Last update |

---

## Order Schema

### Fields (Simplified)
| Field | Type | Description |
|-------|------|-------------|
| `order_id` | UUID | Primary key |
| `buyer_id` | UUID | Reference to User |
| `total_amount` | Decimal(10,2) | Total order amount |
| `status` | Enum | Pending, Confirmed, Shipped, Delivered, Cancelled |
| `created_at` | DateTime | Order date |

---

## API Endpoints

### Product Endpoints

#### **Browse Products (Public)**
```http
GET /api/v1/products
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | Integer | Page number (default: 1) |
| `limit` | Integer | Items per page (default: 20) |
| `search` | String | Search in product name |
| `category` | UUID | Filter by category ID |
| `subcategory` | UUID | Filter by subcategory ID |
| `product_type` | String | livestock, feed, equipment, service, other |
| `min_price` | Number | Minimum price filter |
| `max_price` | Number | Maximum price filter |
| `breed` | String | Search by breed |
| `gender` | String | male, female |
| `health_status` | String | excellent, good, fair, poor, unknown |
| `featured` | Boolean | Show only featured products |
| `availability_status` | String | available, sold, reserved, etc. |
| `sort` | String | Field to sort by (default: created_at) |
| `order` | String | ASC or DESC (default: DESC) |

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "pages": 5,
      "limit": 20
    }
  }
}
```

#### **Get Product by ID (Public)**
```http
GET /api/v1/products/:id
```

**Response includes:**
- Full product details
- Seller information
- Category/subcategory hierarchy
- Currency information
- Breeding lineage (mother/father)
- Computed fields: `final_price`, `savings`, `is_available`, `calculated_age_months`

#### **Create Product (Seller)**
```http
POST /api/v1/seller/products
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Fields:**
- All product fields (see Product Schema above)
- `images[]` - Up to 10 image files

**Required Fields:**
- `name`
- `price`
- `sub_cat_id`

#### **Update Product (Seller)**
```http
PUT /api/v1/seller/products/:id
Authorization: Bearer {token}
```

**Body:** Any product fields to update (all optional)

#### **Delete Product (Seller)**
```http
DELETE /api/v1/seller/products/:id
Authorization: Bearer {token}
```

---

### Currency Endpoints

#### **Get All Currencies (Public)**
```http
GET /api/v1/currencies
```

**Query Parameters:**
- `active_only` - Boolean (default: true)

#### **Get Currency by Code (Public)**
```http
GET /api/v1/currencies/code/:code
```

Example: `GET /api/v1/currencies/code/ETB`

#### **Convert Currency (Public)**
```http
POST /api/v1/currencies/convert
```

**Body:**
```json
{
  "amount": 1000,
  "from_currency": "ETB",
  "to_currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_amount": 1000,
    "from_currency": "ETB",
    "to_currency": "USD",
    "converted_amount": 18.00,
    "exchange_rate": 0.0180
  }
}
```

#### **Admin Currency Management**
```http
POST /api/v1/admin/currencies       # Create currency
PUT /api/v1/admin/currencies/:id    # Update currency
DELETE /api/v1/admin/currencies/:id # Delete currency
```

---

### Category Endpoints

```http
GET /api/v1/categories              # Get all categories
GET /api/v1/categories/:id          # Get category by ID
GET /api/v1/categories/:id/subcategories  # Get subcategories
```

---

## Validation Rules

### Product Validation

**Create Product:**
- `name`: 3-255 characters (required)
- `description`: max 5000 characters
- `price`: > 0 (required)
- `deleted_price`: ≥ price (if provided)
- `discount_percentage`: 0-100
- `age_months`: 0-300
- `date_of_birth`: not in future
- `weight_kg`: 0-99999
- `height_cm`: 0-9999
- `latitude`: -90 to 90
- `longitude`: -180 to 180
- `delivery_timeframe_days`: 0-365

**Update Product:**
- Same rules as create, but all fields optional

### Currency Validation
- `code`: exactly 3 characters (required, unique)
- `name`: 2-50 characters (required)
- `exchange_rate_to_usd`: > 0.0001 (required)
- `decimal_places`: 0-4

---

## Frontend Integration Tips

### 1. **Product Form Fields**
Create a multi-step form with sections:
- Basic Info (name, description, type, category)
- Pricing (price, discount, currency)
- Livestock Details (breed, age, gender, weight, health)
- Location (address, GPS coordinates)
- Media (images, videos)
- Certifications

### 2. **Computed Fields**
Products return computed fields that you don't need to calculate:
- `final_price` - Price after discount
- `savings` - Amount saved
- `is_available` - Boolean availability
- `calculated_age_months` - Auto-calculated age

### 3. **Currency Display**
```javascript
// Use currency info from API
const displayPrice = (product) => {
  const symbol = product.currency_info?.symbol || '';
  const price = product.final_price || product.price;
  return `${symbol} ${price.toLocaleString()}`;
};
```

### 4. **Image Upload**
```javascript
const formData = new FormData();
formData.append('name', 'Product Name');
formData.append('price', 45000);
// Append images
images.forEach(image => formData.append('images', image));
```

### 5. **Filtering Products**
```javascript
const buildQuery = (filters) => {
  const params = new URLSearchParams();
  if (filters.breed) params.append('breed', filters.breed);
  if (filters.minPrice) params.append('min_price', filters.minPrice);
  return `/api/v1/products?${params.toString()}`;
};
```

---

## Data Type Reference

| Type | TypeScript | Description |
|------|-----------|-------------|
| UUID | string | Unique identifier |
| String(n) | string | Max n characters |
| Text | string | Long text |
| Integer | number | Whole number |
| Decimal(m,n) | number | m total digits, n decimals |
| Boolean | boolean | true/false |
| Enum | string | One of specified values |
| Date | string | ISO 8601 date (YYYY-MM-DD) |
| DateTime | string | ISO 8601 datetime |
| JSON Array | any[] | Array of objects |
| JSON Object | object | Key-value object |

---

## Contact & Support

For questions about the API or schema:
- Review the walkthrough documentation
- Check validation error messages in API responses
- All responses follow format: `{ success, message, data }`

Good luck with frontend development! 🚀
