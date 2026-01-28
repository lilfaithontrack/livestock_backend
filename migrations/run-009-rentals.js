const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function runMigration() {
    try {
        console.log('🚀 Starting Rentals Marketplace migration...');

        // Create rental_categories table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS rental_categories (
                category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                name_am VARCHAR(100),
                description TEXT,
                icon VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ rental_categories table created');

        // Create rentals table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS rentals (
                rental_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES rental_categories(category_id) ON DELETE RESTRICT,
                title VARCHAR(255) NOT NULL,
                title_am VARCHAR(255),
                description TEXT,
                description_am TEXT,
                price DECIMAL(12, 2) NOT NULL,
                price_unit VARCHAR(20) DEFAULT 'per_day',
                currency VARCHAR(3) DEFAULT 'ETB',
                negotiable BOOLEAN DEFAULT false,
                contact_phone VARCHAR(20) NOT NULL,
                contact_name VARCHAR(100),
                whatsapp_available BOOLEAN DEFAULT false,
                telegram_available BOOLEAN DEFAULT false,
                location VARCHAR(255),
                location_am VARCHAR(255),
                city VARCHAR(100),
                region VARCHAR(100),
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                image_urls JSON DEFAULT '[]',
                video_urls JSON DEFAULT '[]',
                specifications JSON DEFAULT '{}',
                is_available BOOLEAN DEFAULT true,
                available_from DATE,
                available_until DATE,
                status VARCHAR(20) DEFAULT 'pending',
                admin_approved_by UUID REFERENCES users(user_id),
                rejection_reason TEXT,
                approved_at TIMESTAMP WITH TIME ZONE,
                view_count INTEGER DEFAULT 0,
                contact_count INTEGER DEFAULT 0,
                featured BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ rentals table created');

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_rentals_owner_id ON rentals(owner_id);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_category_id ON rentals(category_id);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_is_available ON rentals(is_available);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_city ON rentals(city);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_price ON rentals(price);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_featured ON rentals(featured);',
            'CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON rentals(created_at);'
        ];

        for (const idx of indexes) {
            await sequelize.query(idx);
        }
        console.log('✅ Indexes created');

        // Insert default categories
        await sequelize.query(`
            INSERT INTO rental_categories (name, name_am, description, icon) VALUES
                ('Event Places', 'የዝግጅት ቦታዎች', 'Venues for weddings, conferences, parties, and other events', 'calendar'),
                ('Houses', 'ቤቶች', 'Houses and apartments for rent', 'home'),
                ('Cars', 'መኪናዎች', 'Cars and vehicles for rent', 'car'),
                ('Equipment', 'መሳሪያዎች', 'Equipment and machinery for rent', 'tool'),
                ('Offices', 'ቢሮዎች', 'Office spaces for rent', 'building'),
                ('Land', 'መሬት', 'Land and plots for rent', 'map'),
                ('Other', 'ሌሎች', 'Other rental items', 'more-horizontal')
            ON CONFLICT DO NOTHING;
        `);
        console.log('✅ Default rental categories inserted');

        console.log('🎉 Rentals Marketplace migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
