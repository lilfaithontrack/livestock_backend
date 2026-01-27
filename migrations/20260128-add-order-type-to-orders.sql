-- Migration: Add order_type to orders table
-- Date: 2026-01-28

-- Add order_type column
ALTER TABLE orders 
ADD COLUMN order_type ENUM('regular', 'qercha') 
NOT NULL DEFAULT 'regular' 
COMMENT 'Type of order - regular product purchase or qercha share purchase';

-- Add index for faster filtering
CREATE INDEX idx_orders_order_type ON orders(order_type);
