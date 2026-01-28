-- Migration: Create Rentals Marketplace Schema
-- Description: Schema for rental listings (event places, houses, cars, etc.) with contact info

-- Create rental_categories table
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

-- Create rentals table
CREATE TABLE IF NOT EXISTS rentals (
    rental_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner/Poster Information
    owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Category
    category_id UUID NOT NULL REFERENCES rental_categories(category_id) ON DELETE RESTRICT,
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    title_am VARCHAR(255),
    description TEXT,
    description_am TEXT,
    
    -- Pricing
    price DECIMAL(12, 2) NOT NULL,
    price_unit VARCHAR(20) DEFAULT 'per_day', -- per_day, per_hour, per_week, per_month, per_event
    currency VARCHAR(3) DEFAULT 'ETB',
    negotiable BOOLEAN DEFAULT false,
    
    -- Contact Information (Single phone for all rentals)
    contact_phone VARCHAR(20) NOT NULL,
    contact_name VARCHAR(100),
    whatsapp_available BOOLEAN DEFAULT false,
    telegram_available BOOLEAN DEFAULT false,
    
    -- Location
    location VARCHAR(255),
    location_am VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Media
    image_urls JSON DEFAULT '[]',
    video_urls JSON DEFAULT '[]',
    
    -- Specifications (flexible JSON for different rental types)
    specifications JSON DEFAULT '{}',
    -- Examples:
    -- House: {bedrooms: 3, bathrooms: 2, area_sqm: 150, furnished: true, parking: true}
    -- Car: {brand: "Toyota", model: "Corolla", year: 2020, seats: 5, transmission: "automatic", fuel_type: "petrol"}
    -- Event Place: {capacity: 500, indoor: true, outdoor_space: true, catering_available: true, sound_system: true}
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    available_from DATE,
    available_until DATE,
    
    -- Status & Moderation
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, archived
    admin_approved_by UUID REFERENCES users(user_id),
    rejection_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metrics
    view_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0, -- Track how many times call button was clicked
    featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rentals_owner_id ON rentals(owner_id);
CREATE INDEX IF NOT EXISTS idx_rentals_category_id ON rentals(category_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_is_available ON rentals(is_available);
CREATE INDEX IF NOT EXISTS idx_rentals_city ON rentals(city);
CREATE INDEX IF NOT EXISTS idx_rentals_price ON rentals(price);
CREATE INDEX IF NOT EXISTS idx_rentals_featured ON rentals(featured);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON rentals(created_at);

-- Insert default rental categories
INSERT INTO rental_categories (name, name_am, description, icon) VALUES
    ('Event Places', 'የዝግጅት ቦታዎች', 'Venues for weddings, conferences, parties, and other events', 'calendar'),
    ('Houses', 'ቤቶች', 'Houses and apartments for rent', 'home'),
    ('Cars', 'መኪናዎች', 'Cars and vehicles for rent', 'car'),
    ('Equipment', 'መሳሪያዎች', 'Equipment and machinery for rent', 'tool'),
    ('Offices', 'ቢሮዎች', 'Office spaces for rent', 'building'),
    ('Land', 'መሬት', 'Land and plots for rent', 'map'),
    ('Other', 'ሌሎች', 'Other rental items', 'more-horizontal')
ON CONFLICT DO NOTHING;
