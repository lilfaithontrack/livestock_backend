require('dotenv').config();
const db = require('./models');
const bcrypt = require('bcrypt');

const {
    User,
    ProductCategory,
    ProductSubcategory,
    Product,
    QerchaPackage,
    Currency
} = db;

/**
 * Database Seeder Script
 * Populates the database with sample data for testing
 * Run: node seed-data.js
 */

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Start transaction
        const transaction = await db.sequelize.transaction();

        try {
            // ==================== USERS ====================
            console.log('👥 Creating/finding users...');

            const hashedPassword = await bcrypt.hash('password123', 10);

            const [admin] = await User.findOrCreate({
                where: { email: 'admin@ethiolivestock.com' },
                defaults: {
                    phone: '0911111111',
                    email: 'admin@ethiolivestock.com',
                    password: hashedPassword,
                    role: 'Admin',
                    kyc_status: true,
                    address: 'Addis Ababa, Ethiopia'
                },
                transaction
            });

            const [seller1] = await User.findOrCreate({
                where: { email: 'seller1@example.com' },
                defaults: {
                    phone: '0922222222',
                    email: 'seller1@example.com',
                    password: hashedPassword,
                    role: 'Seller',
                    kyc_status: true,
                    address: 'Bishoftu, Ethiopia'
                },
                transaction
            });

            const [seller2] = await User.findOrCreate({
                where: { email: 'seller2@example.com' },
                defaults: {
                    phone: '0933333333',
                    email: 'seller2@example.com',
                    password: hashedPassword,
                    role: 'Seller',
                    kyc_status: true,
                    address: 'Bahir Dar, Ethiopia'
                },
                transaction
            });

            const [buyer] = await User.findOrCreate({
                where: { email: 'buyer@example.com' },
                defaults: {
                    phone: '0944444444',
                    email: 'buyer@example.com',
                    password: hashedPassword,
                    role: 'Buyer',
                    address: 'Addis Ababa, Ethiopia'
                },
                transaction
            });

            console.log('✓ Users ready (admin, 2 sellers, 1 buyer)\n');

            // ==================== CURRENCIES ====================
            console.log('💱 Creating/finding currencies...');

            const [etb] = await Currency.findOrCreate({
                where: { code: 'ETB' },
                defaults: {
                    code: 'ETB',
                    name: 'Ethiopian Birr',
                    symbol: 'Br',
                    exchange_rate_to_base: 1.00,
                    is_active: true
                },
                transaction
            });

            const [usd] = await Currency.findOrCreate({
                where: { code: 'USD' },
                defaults: {
                    code: 'USD',
                    name: 'US Dollar',
                    symbol: '$',
                    exchange_rate_to_base: 56.50,
                    is_active: true
                },
                transaction
            });

            console.log('✓ Currencies ready\n');

            // ==================== CATEGORIES & SUBCATEGORIES ====================
            console.log('📂 Creating/finding categories and subcategories...');

            // Livestock Category
            const [livestockCat] = await ProductCategory.findOrCreate({
                where: { slug: 'livestock' },
                defaults: {
                    name: 'Livestock',
                    slug: 'livestock',
                    description: 'Farm animals for sale',
                    is_active: true
                },
                transaction
            });

            const cattleSubcat = await ProductSubcategory.create({
                cat_id: livestockCat.cat_id,
                name: 'Cattle',
                slug: 'cattle',
                description: 'Cows, bulls, and calves',
                is_active: true
            }, { transaction });

            const sheepSubcat = await ProductSubcategory.create({
                cat_id: livestockCat.cat_id,
                name: 'Sheep & Goats',
                slug: 'sheep-goats',
                description: 'Sheep and goats for sale',
                is_active: true
            }, { transaction });

            // Electronics Category
            const electronicsCat = await ProductCategory.create({
                name: 'Electronics',
                slug: 'electronics',
                description: 'Electronic devices and gadgets',
                is_active: true
            }, { transaction });

            const mobileSubcat = await ProductSubcategory.create({
                cat_id: electronicsCat.cat_id,
                name: 'Mobile Phones',
                slug: 'mobile-phones',
                description: 'Smartphones and feature phones',
                is_active: true
            }, { transaction });

            const laptopSubcat = await ProductSubcategory.create({
                cat_id: electronicsCat.cat_id,
                name: 'Laptops',
                slug: 'laptops',
                description: 'Laptops and notebooks',
                is_active: true
            }, { transaction });

            // Clothing Category
            const clothingCat = await ProductCategory.create({
                name: 'Clothing',
                slug: 'clothing',
                description: 'Fashion and apparel',
                is_active: true
            }, { transaction });

            const menClothingSubcat = await ProductSubcategory.create({
                cat_id: clothingCat.cat_id,
                name: "Men's Wear",
                slug: 'mens-wear',
                description: "Men's clothing and accessories",
                is_active: true
            }, { transaction });

            // Food Category
            const foodCat = await ProductCategory.create({
                name: 'Food & Beverages',
                slug: 'food-beverages',
                description: 'Fresh produce and food items',
                is_active: true
            }, { transaction });

            const honeySubcat = await ProductSubcategory.create({
                cat_id: foodCat.cat_id,
                name: 'Honey & Natural Products',
                slug: 'honey-natural',
                description: 'Organic honey and natural products',
                is_active: true
            }, { transaction });

            console.log('✓ Created 4 categories and 7 subcategories\n');

            // ==================== PRODUCTS ====================
            console.log('📦 Creating products...');

            // Livestock Products
            const holsteinCow = await Product.create({
                seller_id: seller1.user_id,
                sub_cat_id: cattleSubcat.sub_cat_id,
                sku: 'LVS-COW-001',
                name: 'Premium Holstein Dairy Cow',
                description: 'Excellent dairy cow with high milk production. Healthy and vaccinated.',
                product_type: 'livestock',
                price: 85000,
                currency: 'ETB',
                currency_id: etb.currency_id,
                stock_quantity: 3,
                low_stock_threshold: 1,
                enable_stock_management: true,
                weight: 650,
                weight_unit: 'kg',
                condition: 'good',
                metadata: {
                    breed: 'Holstein Friesian',
                    age_months: 36,
                    gender: 'female',
                    health_status: 'excellent',
                    milk_production_liters_per_day: 28,
                    vaccination_records: [
                        { vaccine: 'FMD', date: '2024-11-01' },
                        { vaccine: 'Brucellosis', date: '2024-09-15' }
                    ]
                },
                location: 'Bishoftu, Ethiopia',
                image_urls: [],
                status: 'Live',
                featured: true,
                availability_status: 'available'
            }, { transaction });

            const boerGoat = await Product.create({
                seller_id: seller1.user_id,
                sub_cat_id: sheepSubcat.sub_cat_id,
                sku: 'LVS-GOAT-001',
                name: 'Boer Goat - Breeding Quality',
                description: 'High-quality Boer goat perfect for breeding or meat production.',
                product_type: 'livestock',
                price: 15000,
                currency: 'ETB',
                currency_id: etb.currency_id,
                stock_quantity: 8,
                low_stock_threshold: 3,
                enable_stock_management: true,
                weight: 45,
                weight_unit: 'kg',
                condition: 'good',
                metadata: {
                    breed: 'Boer',
                    age_months: 18,
                    gender: 'male',
                    health_status: 'excellent'
                },
                location: 'Bishoftu, Ethiopia',
                status: 'Live',
                availability_status: 'available'
            }, { transaction });

            // Electronics Products
            const samsungPhone = await Product.create({
                seller_id: seller2.user_id,
                sub_cat_id: mobileSubcat.sub_cat_id,
                sku: 'ELEC-PHN-001',
                name: 'Samsung Galaxy S24 Ultra',
                description: 'Latest flagship smartphone with advanced camera and 5G.',
                product_type: 'electronics',
                price: 125000,
                deleted_price: 145000,
                discount_percentage: 13.79,
                currency: 'ETB',
                currency_id: etb.currency_id,
                stock_quantity: 15,
                low_stock_threshold: 5,
                enable_stock_management: true,
                brand: 'Samsung',
                model_number: 'SM-S928B',
                condition: 'new',
                weight: 0.232,
                weight_unit: 'kg',
                dimensions: { length: 16.26, width: 7.9, height: 0.86, unit: 'cm' },
                color: 'Titanium Gray',
                warranty_info: '1 year manufacturer warranty',
                manufacture_date: '2024-02-01',
                metadata: {
                    processor: 'Snapdragon 8 Gen 3',
                    ram: '12GB',
                    storage: '256GB',
                    screen_size: '6.8 inches',
                    battery_capacity: '5000mAh',
                    camera: '200MP main + 12MP ultrawide + 50MP telephoto',
                    operating_system: 'Android 14'
                },
                location: 'Bahir Dar, Ethiopia',
                tags: ['smartphone', 'samsung', '5g', 'flagship'],
                status: 'Live',
                featured: true,
                availability_status: 'available'
            }, { transaction });

            const macbook = await Product.create({
                seller_id: seller2.user_id,
                sub_cat_id: laptopSubcat.sub_cat_id,
                sku: 'ELEC-LAP-001',
                name: 'MacBook Pro 16" M3 Max',
                description: 'Powerful laptop for professionals with M3 Max chip.',
                product_type: 'electronics',
                price: 285000,
                currency: 'ETB',
                currency_id: etb.currency_id,
                stock_quantity: 5,
                low_stock_threshold: 2,
                enable_stock_management: true,
                brand: 'Apple',
                model_number: 'MacBook Pro 16" 2024',
                condition: 'new',
                weight: 2.15,
                weight_unit: 'kg',
                color: 'Space Gray',
                warranty_info: '1 year AppleCare',
                manufacture_date: '2024-11-01',
                metadata: {
                    processor: 'Apple M3 Max',
                    ram: '36GB',
                    storage: '1TB SSD',
                    screen_size: '16.2 inches',
                    resolution: '3456 x 2234',
                    graphics: 'M3 Max 40-core GPU',
                    battery_life: '22 hours'
                },
                location: 'Bahir Dar, Ethiopia',
                status: 'Live',
                availability_status: 'available'
            }, { transaction });

            // Clothing Product
            const tshirt = await Product.create({
                seller_id: seller2.user_id,
                sub_cat_id: menClothingSubcat.sub_cat_id,
                sku: 'CLO-TSH-001',
                name: "Men's Premium Cotton T-Shirt",
                description: 'Comfortable 100% cotton t-shirt with modern fit.',
                product_type: 'clothing',
                price: 800,
                currency: 'ETB',
                currency_id: etb.currency_id,
                stock_quantity: 50,
                low_stock_threshold: 10,
                enable_stock_management: true,
                brand: 'Local Brand',
                size: 'L',
                color: 'Navy Blue',
                material: '100% Premium Cotton',
                condition: 'new',
                weight: 0.2,
                weight_unit: 'kg',
                metadata: {
                    fabric_type: 'Combed cotton',
                    care_instructions: 'Machine wash cold, tumble dry low',
                    fit_type: 'Regular fit',
                    season: 'All season',
                    collar_type: 'Crew neck'
                },
                location: 'Bahir Dar, Ethiopia',
                status: 'Live',
                availability_status: 'available'
            }, { transaction });

            // Food Product
            const honey = await Product.create({
                seller_id: seller1.user_id,
                sub_cat_id: honeySubcat.sub_cat_id,
                sku: 'FOOD-HON-001',
                name: 'Organic Ethiopian White Honey',
                description: 'Pure organic honey from Ethiopian highlands.',
                product_type: 'food',
                price: 1200,
                currency: 'ETB',
                currency_id: etb.currency_id,
                stock_quantity: 100,
                low_stock_threshold: 20,
                enable_stock_management: true,
                weight: 500,
                weight_unit: 'g',
                condition: 'new',
                manufacture_date: '2024-12-01',
                expiry_date: '2026-12-01',
                metadata: {
                    ingredients: ['Pure organic honey'],
                    nutritional_info: {
                        calories_per_100g: 304,
                        carbohydrates: '82g',
                        sugars: '82g'
                    },
                    allergens: [],
                    storage_instructions: 'Store in a cool, dry place',
                    certified_organic: true,
                    origin: 'Ethiopian highlands'
                },
                location: 'Bishoftu, Ethiopia',
                tags: ['organic', 'honey', 'natural', 'ethiopian'],
                status: 'Live',
                featured: true,
                availability_status: 'available'
            }, { transaction });

            console.log('✓ Created 6 products (livestock, electronics, clothing, food)\n');

            // ==================== QERCHA PACKAGES ====================
            console.log('🐂 Creating Qercha packages...');

            const qercha1 = await QerchaPackage.create({
                ox_product_id: holsteinCow.product_id,
                host_user_id: seller1.user_id,
                package_name: 'Premium Holstein Cow - Group Purchase',
                description: 'Share ownership of a premium dairy cow with other buyers',
                total_shares: 10,
                shares_available: 7,
                share_price: 8500,
                min_shares_per_user: 1,
                max_shares_per_user: 3,
                package_status: 'Active',
                start_date: new Date(),
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            }, { transaction });

            const qercha2 = await QerchaPackage.create({
                ox_product_id: boerGoat.product_id,
                host_user_id: seller1.user_id,
                package_name: 'Boer Goat Group Purchase',
                description: 'Affordable goat ownership through shared purchase',
                total_shares: 5,
                shares_available: 5,
                share_price: 3000,
                min_shares_per_user: 1,
                max_shares_per_user: 2,
                package_status: 'Active',
                start_date: new Date(),
                end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
            }, { transaction });

            console.log('✓ Created 2 Qercha packages\n');

            // Commit transaction
            await transaction.commit();

            console.log('✅ Database seeding completed successfully!\n');
            console.log('📊 Summary:');
            console.log('   - 4 users (1 admin, 2 sellers, 1 buyer)');
            console.log('   - 2 currencies (ETB, USD)');
            console.log('   - 4 categories');
            console.log('   - 7 subcategories');
            console.log('   - 6 products (multi-category)');
            console.log('   - 2 Qercha packages');
            console.log('\n🔐 Login Credentials:');
            console.log('   Admin:   0911111111 / password123');
            console.log('   Seller1: 0922222222 / password123');
            console.log('   Seller2: 0933333333 / password123');
            console.log('   Buyer:   0944444444 / password123');

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await db.sequelize.close();
        console.log('\n🔌 Database connection closed.');
        process.exit(0);
    }
}

// Run the seeder
seedDatabase();
