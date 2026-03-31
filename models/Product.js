const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('products', {
    product_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // === BASIC INFORMATION ===
    seller_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    sub_cat_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'product_subcategories',
            key: 'sub_cat_id'
        }
    },
    sku: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Stock Keeping Unit - Auto-generated unique identifier'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    product_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type/category of product (e.g., livestock, electronics, clothing, services, etc.)'
    },

    // === PRICING & INVENTORY ===
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    deleted_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Original price before discount'
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100
        },
        comment: 'Discount percentage (0-100)'
    },
    currency_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'currencies',
            key: 'currency_id'
        },
        comment: 'Reference to currency model'
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ETB',
        comment: 'Legacy currency code (kept for backward compatibility)'
    },
    stock_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 0
        },
        comment: 'Available quantity in stock'
    },
    minimum_order_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    low_stock_threshold: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        validate: {
            min: 0
        },
        comment: 'Alert when stock falls below this threshold'
    },
    reserved_stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        },
        comment: 'Stock reserved for pending orders (not yet deducted)'
    },
    enable_stock_management: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Toggle stock tracking on/off for this product'
    },
    allow_backorders: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Allow orders when out of stock'
    },

    // === LIVESTOCK SPECIFIC ===
    breed: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Breed of the animal (e.g. Boran, Holstein, Horro)'
    },
    age_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Age of the animal in months'
    },
    date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date of birth of the animal'
    },
    gender: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Gender of the animal (Male, Female)'
    },
    weight_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Weight in kilograms'
    },
    height_cm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Height in centimeters'
    },
    color_markings: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Color and markings description'
    },
    mother_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Reference to mother product for lineage tracking'
    },
    father_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Reference to father product for lineage tracking'
    },

    // === HEALTH & MEDICAL ===
    health_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'unknown',
        comment: 'Current health status (healthy, sick, recovering, unknown)'
    },
    vaccination_records: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of vaccination records'
    },
    medical_history: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Medical history notes'
    },
    veterinary_certificates: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of veterinary certificate URLs'
    },
    last_health_checkup: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date of last health checkup'
    },

    // === GENETICS & PERFORMANCE ===
    genetic_traits: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Genetic traits and characteristics'
    },
    milk_production_liters_per_day: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Daily milk production in liters'
    },
    breeding_history: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Breeding history notes'
    },
    offspring_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of offspring'
    },

    // === PRODUCT SPECIFICATIONS ===
    // Generic fields for dimensions, weight, and attributes that work for any product type
    weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Product weight (unit specified in weight_unit)'
    },
    weight_unit: {
        type: DataTypes.STRING(10),
        defaultValue: 'kg',
        comment: 'Unit of weight measurement (kg, g, lbs, etc.)'
    },
    dimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Product dimensions {length, width, height, unit}'
    },
    color: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Primary color or color variations'
    },
    size: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Size specification (S, M, L, XL, or custom)'
    },
    material: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Material composition or construction'
    },
    brand: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Brand name or manufacturer'
    },
    model_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Model or version number'
    },
    condition: {
        type: DataTypes.ENUM('new', 'like_new', 'good', 'fair', 'poor', 'refurbished'),
        defaultValue: 'new',
        comment: 'Product condition'
    },
    warranty_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Warranty details and coverage information'
    },
    manufacture_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date of manufacture or production'
    },
    expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Expiration date (for perishable goods, medications, etc.)'
    },

    // === LOCATION & LOGISTICS ===
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Text description of location'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: {
            min: -90,
            max: 90
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: {
            min: -180,
            max: 180
        }
    },
    shipping_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether shipping/delivery is available'
    },
    delivery_timeframe_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated delivery time in days'
    },
    pickup_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether pickup is available'
    },

    // === CERTIFICATIONS & COMPLIANCE ===
    certificate_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'URLs to certificates (health, organic, quality, etc.)'
    },
    license_numbers: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Relevant license and permit numbers'
    },
    organic_certified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the product is organic certified'
    },

    // === MEDIA ===
    image_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of product image URLs'
    },
    video_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of product video URLs'
    },
    youtube_video_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'YouTube video URL for product showcase'
    },
    social_media_links: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Social media links {facebook, instagram, tiktok, twitter, telegram}'
    },

    // === MARKETPLACE FEATURES ===
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is a featured product'
    },
    view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of times product has been viewed'
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
            min: 0,
            max: 5
        },
        comment: 'Average rating (0-5)'
    },
    review_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of reviews received'
    },
    availability_status: {
        type: DataTypes.ENUM('available', 'sold', 'reserved', 'pending_sale', 'unavailable'),
        defaultValue: 'available',
        comment: 'Current availability status'
    },

    // === ADMIN & STATUS ===
    status: {
        type: DataTypes.ENUM('Pending', 'Live', 'Rejected', 'Archived'),
        defaultValue: 'Pending',
        allowNull: false
    },
    admin_approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when admin approved the product'
    },
    published_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the product went live'
    },
    sold_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the product was sold'
    },

    // === METADATA ===
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: `Industry-specific attributes stored as flexible JSON. Examples:
        - Livestock: {breed, age_months, gender, health_status, vaccination_records, genetic_traits, milk_production, breeding_history, etc.}
        - Electronics: {processor, ram, storage, screen_size, battery_life, operating_system, etc.}
        - Clothing: {fabric_type, care_instructions, fit_type, season, style, etc.}
        - Food: {ingredients, nutritional_info, allergens, storage_instructions, etc.}
        - Services: {duration, skill_level, requirements, included_items, etc.}`
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Search tags for better discoverability'
    }
}, {
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['seller_id'] },
        { fields: ['sub_cat_id'] },
        { fields: ['status'] },
        { fields: ['availability_status'] },
        { fields: ['product_type'] },
        { fields: ['featured'] },
        { fields: ['price'] },
        { fields: ['created_at'] },
        { fields: ['sku'], unique: true }
    ]
});

module.exports = Product;
