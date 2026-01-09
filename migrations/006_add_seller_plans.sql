-- Migration: Add Seller Plans for Commission/Subscription Model
-- Description: Creates seller_plans table to manage seller payment options
-- Date: 2026-01-05

-- Create seller_plans table
CREATE TABLE IF NOT EXISTS seller_plans (
    plan_id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    plan_type ENUM('commission', 'subscription') NOT NULL COMMENT 'Type of plan: commission-based or subscription-based',
    commission_rate DECIMAL(5, 2) NULL COMMENT 'Commission percentage per sale (only for commission plan)',
    subscription_fee DECIMAL(10, 2) NULL COMMENT 'Monthly subscription fee (only for subscription plan)',
    max_products INT NULL COMMENT 'Maximum number of products allowed (only for subscription plan)',
    subscription_start_date DATETIME NULL COMMENT 'Start date of subscription period',
    subscription_end_date DATETIME NULL COMMENT 'End date of subscription period',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether the plan is currently active',
    auto_renew BOOLEAN DEFAULT FALSE COMMENT 'Auto-renew subscription at end of period',
    payment_status ENUM('pending', 'paid', 'failed', 'expired') DEFAULT 'pending' COMMENT 'Payment status for subscription plans',
    payment_reference VARCHAR(255) NULL COMMENT 'Payment transaction reference',
    payment_proof_url VARCHAR(500) NULL COMMENT 'URL to payment proof document',
    approved_by CHAR(36) NULL COMMENT 'Admin who approved the plan',
    approved_at DATETIME NULL COMMENT 'Timestamp when plan was approved',
    notes TEXT NULL COMMENT 'Additional notes or comments',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_seller_id (seller_id),
    INDEX idx_plan_type (plan_type),
    INDEX idx_is_active (is_active),
    INDEX idx_payment_status (payment_status),
    INDEX idx_subscription_end_date (subscription_end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns to users table to track current plan
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_plan_id CHAR(36) NULL COMMENT 'Current active seller plan',
ADD COLUMN IF NOT EXISTS plan_selected_at DATETIME NULL COMMENT 'When seller selected their plan',
ADD CONSTRAINT fk_users_current_plan FOREIGN KEY (current_plan_id) REFERENCES seller_plans(plan_id) ON DELETE SET NULL;

-- Add index for current_plan_id
CREATE INDEX IF NOT EXISTS idx_users_current_plan ON users(current_plan_id);

-- Insert default commission and subscription plan templates (optional - for admin reference)
-- These are not assigned to any seller, just templates
INSERT INTO seller_plans (plan_id, seller_id, plan_type, commission_rate, is_active, notes, created_at, updated_at)
SELECT 
    UUID() as plan_id,
    (SELECT user_id FROM users WHERE role = 'Admin' LIMIT 1) as seller_id,
    'commission' as plan_type,
    15.00 as commission_rate,
    FALSE as is_active,
    'Default commission plan template - 15% per sale' as notes,
    NOW() as created_at,
    NOW() as updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM seller_plans WHERE notes LIKE '%Default commission plan template%'
);

INSERT INTO seller_plans (plan_id, seller_id, plan_type, subscription_fee, max_products, is_active, notes, created_at, updated_at)
SELECT 
    UUID() as plan_id,
    (SELECT user_id FROM users WHERE role = 'Admin' LIMIT 1) as seller_id,
    'subscription' as plan_type,
    500.00 as subscription_fee,
    50 as max_products,
    FALSE as is_active,
    'Default subscription plan template - 500 ETB/month for 50 products' as notes,
    NOW() as created_at,
    NOW() as updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM seller_plans WHERE notes LIKE '%Default subscription plan template%'
);
