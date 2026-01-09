-- Stock Management System Migration
-- Adds comprehensive inventory tracking to the Ethio Livestock Platform

-- Step 1: Add stock management fields to products table
ALTER TABLE products
ADD COLUMN low_stock_threshold INT DEFAULT 5 COMMENT 'Alert when stock falls below this threshold',
ADD COLUMN reserved_stock INT DEFAULT 0 COMMENT 'Stock reserved for pending orders (not yet deducted)',
ADD COLUMN enable_stock_management BOOLEAN DEFAULT true COMMENT 'Toggle stock tracking on/off for this product',
ADD COLUMN allow_backorders BOOLEAN DEFAULT false COMMENT 'Allow orders when out of stock';

-- Step 2: Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    movement_type ENUM('sale', 'restock', 'adjustment', 'return', 'reservation', 'reservation_release') NOT NULL COMMENT 'Type of stock movement',
    quantity INT NOT NULL COMMENT 'Positive for additions, negative for reductions',
    previous_quantity INT NOT NULL COMMENT 'Stock quantity before this movement',
    new_quantity INT NOT NULL COMMENT 'Stock quantity after this movement',
    reference_id CHAR(36) NULL COMMENT 'ID of related entity (order_id, etc.)',
    reference_type VARCHAR(50) NULL COMMENT 'Type of reference (order, manual, etc.)',
    notes TEXT NULL COMMENT 'Additional notes about this movement',
    performed_by CHAR(36) NULL COMMENT 'User who performed this action',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_product_id (product_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_created_at (created_at),
    INDEX idx_reference_id (reference_id),
    INDEX idx_performed_by (performed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add indexes for efficient stock queries
CREATE INDEX idx_stock_quantity ON products(stock_quantity);
CREATE INDEX idx_low_stock_threshold ON products(low_stock_threshold);
CREATE INDEX idx_enable_stock_management ON products(enable_stock_management);

-- Step 4: Update existing products to have sensible defaults
UPDATE products 
SET 
    low_stock_threshold = 5,
    reserved_stock = 0,
    enable_stock_management = true,
    allow_backorders = false
WHERE low_stock_threshold IS NULL;

-- Migration complete!
-- Stock management system is now active.
