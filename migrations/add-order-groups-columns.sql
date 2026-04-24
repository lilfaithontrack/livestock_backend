-- Add Order Groups columns to existing tables
-- Run this SQL directly in MySQL if the JS migration fails

-- 1. Create order_groups table (without foreign key constraints)
CREATE TABLE IF NOT EXISTS order_groups (
    group_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    buyer_id CHAR(36) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    payment_proof_url VARCHAR(500),
    shipping_address TEXT,
    shipping_full_name VARCHAR(255),
    shipping_phone VARCHAR(20),
    shipping_city VARCHAR(100),
    shipping_region VARCHAR(100),
    shipping_notes TEXT,
    order_type ENUM('regular', 'qercha') NOT NULL DEFAULT 'regular',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add group_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS group_id CHAR(36) NULL,
ADD INDEX IF NOT EXISTS idx_group_id (group_id);

-- 3. Add seller_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS seller_id CHAR(36) NULL,
ADD INDEX IF NOT EXISTS idx_seller_id (seller_id);

-- 4. Add group_id to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS group_id CHAR(36) NULL,
ADD INDEX IF NOT EXISTS idx_payment_group_id (group_id);
