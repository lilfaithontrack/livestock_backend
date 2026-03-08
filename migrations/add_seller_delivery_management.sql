-- Migration: Add Seller Delivery Management System
-- Description: Creates seller_settings table and adds new fields to deliveries table
-- Date: 2026-03-07

-- ============================================
-- Create seller_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS seller_settings (
    setting_id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL UNIQUE,
    
    -- Delivery Preferences
    can_self_deliver BOOLEAN DEFAULT TRUE COMMENT 'Seller can deliver their own orders',
    auto_accept_delivery BOOLEAN DEFAULT FALSE COMMENT 'Automatically accept delivery assignments',
    preferred_delivery_radius_km DECIMAL(6,2) DEFAULT 10.00 COMMENT 'Maximum delivery radius in km',
    delivery_fee_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Additional delivery fee percentage',
    
    -- Notification Preferences
    notify_new_orders BOOLEAN DEFAULT TRUE,
    notify_delivery_assigned BOOLEAN DEFAULT TRUE,
    notify_delivery_completed BOOLEAN DEFAULT TRUE,
    
    -- Business Hours and Agent Management
    business_hours JSON COMMENT 'Operating hours for deliveries',
    preferred_agents JSON COMMENT 'List of preferred delivery agent IDs',
    blocked_agents JSON COMMENT 'List of blocked agent IDs',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_seller_id (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Add new columns to deliveries table
-- ============================================

-- Seller assignment tracking
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS seller_assigned_by CHAR(36) COMMENT 'Seller who assigned this delivery',
ADD COLUMN IF NOT EXISTS assignment_type ENUM('admin', 'seller', 'auto') DEFAULT 'admin' COMMENT 'Who assigned the delivery';

-- Delivery details
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS seller_notes TEXT COMMENT 'Notes from seller about delivery',
ADD COLUMN IF NOT EXISTS pickup_location JSON COMMENT 'Seller location for pickup {lat, lng, address}',
ADD COLUMN IF NOT EXISTS delivery_location JSON COMMENT 'Buyer location for delivery {lat, lng, address}';

-- Timing
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS estimated_pickup_time DATETIME COMMENT 'Estimated pickup time',
ADD COLUMN IF NOT EXISTS actual_pickup_time DATETIME COMMENT 'Actual pickup time';

-- Feedback
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS delivery_rating INT CHECK (delivery_rating BETWEEN 1 AND 5) COMMENT 'Delivery rating 1-5',
ADD COLUMN IF NOT EXISTS delivery_feedback TEXT COMMENT 'Feedback about delivery';

-- Add foreign key for seller_assigned_by
ALTER TABLE deliveries 
ADD CONSTRAINT fk_deliveries_seller_assigned_by 
FOREIGN KEY (seller_assigned_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add indexes for better query performance
ALTER TABLE deliveries 
ADD INDEX IF NOT EXISTS idx_seller_assigned_by (seller_assigned_by),
ADD INDEX IF NOT EXISTS idx_assignment_type (assignment_type),
ADD INDEX IF NOT EXISTS idx_delivery_status (status);

-- ============================================
-- Create default settings for existing sellers
-- ============================================

INSERT INTO seller_settings (setting_id, seller_id)
SELECT UUID(), user_id
FROM users
WHERE role = 'Seller'
AND user_id NOT IN (SELECT seller_id FROM seller_settings)
ON DUPLICATE KEY UPDATE seller_id = seller_id;

-- ============================================
-- Migration complete
-- ============================================

-- Verify tables
SELECT 'seller_settings table created' AS status, COUNT(*) AS count FROM seller_settings;
SELECT 'deliveries table updated' AS status, COUNT(*) AS count FROM deliveries;
