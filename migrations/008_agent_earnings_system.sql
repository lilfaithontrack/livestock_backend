-- Agent Earnings System Migration
-- Run this migration to add agent earnings and payout tables

-- Create agent_payouts table first (referenced by agent_earnings)
CREATE TABLE IF NOT EXISTS agent_payouts (
    payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(user_id),
    amount DECIMAL(10, 2) NOT NULL,
    bank_name VARCHAR(100),
    account_name VARCHAR(200),
    account_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Processing', 'Completed', 'Rejected')),
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    processed_by UUID REFERENCES users(user_id),
    payment_proof_url VARCHAR(500),
    transaction_reference VARCHAR(100),
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agent_earnings table
CREATE TABLE IF NOT EXISTS agent_earnings (
    earning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(user_id),
    order_id UUID NOT NULL REFERENCES orders(order_id),
    delivery_id UUID REFERENCES deliveries(delivery_id),
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 15,
    platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    distance_km DECIMAL(10, 2),
    base_fee DECIMAL(10, 2),
    per_km_rate DECIMAL(10, 2),
    bonus_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'on_hold')),
    available_date TIMESTAMP,
    payout_id UUID REFERENCES agent_payouts(payout_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create delivery_settings table for configurable rates
CREATE TABLE IF NOT EXISTS delivery_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value DECIMAL(10, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default delivery settings
INSERT INTO delivery_settings (setting_key, setting_value, description) VALUES
    ('base_delivery_fee', 50.00, 'Base fee for any delivery in ETB'),
    ('per_km_rate', 10.00, 'Rate per kilometer in ETB'),
    ('platform_commission_rate', 15.00, 'Platform commission percentage from delivery fee'),
    ('min_delivery_fee', 30.00, 'Minimum delivery fee in ETB'),
    ('max_delivery_distance_km', 50.00, 'Maximum delivery distance in kilometers'),
    ('agent_bonus_threshold', 10, 'Number of deliveries for bonus eligibility'),
    ('agent_bonus_amount', 100.00, 'Bonus amount for reaching threshold')
ON CONFLICT (setting_key) DO NOTHING;

-- Add agent bank account fields to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agent_bank_name') THEN
        ALTER TABLE users ADD COLUMN agent_bank_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agent_account_name') THEN
        ALTER TABLE users ADD COLUMN agent_account_name VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agent_account_number') THEN
        ALTER TABLE users ADD COLUMN agent_account_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agent_total_deliveries') THEN
        ALTER TABLE users ADD COLUMN agent_total_deliveries INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agent_rating') THEN
        ALTER TABLE users ADD COLUMN agent_rating DECIMAL(3, 2) DEFAULT 5.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agent_rating_count') THEN
        ALTER TABLE users ADD COLUMN agent_rating_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add delivery fee fields to orders table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_distance_km') THEN
        ALTER TABLE orders ADD COLUMN delivery_distance_km DECIMAL(10, 2);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_earnings_agent_id ON agent_earnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_order_id ON agent_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_status ON agent_earnings(status);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_available_date ON agent_earnings(available_date);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_agent_id ON agent_payouts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_status ON agent_payouts(status);
