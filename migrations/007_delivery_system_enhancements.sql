-- Migration: Delivery System Enhancements
-- Description: Updates orders table for full delivery workflow with QR/OTP verification
-- Date: 2026-01-22

-- Update order_status enum to include new statuses
ALTER TABLE orders 
  MODIFY COLUMN order_status ENUM('Placed', 'Paid', 'Approved', 'Assigned', 'In_Transit', 'Delivered', 'Cancelled') DEFAULT 'Placed';

-- Add delivery-related fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_type ENUM('platform', 'seller', 'pickup') DEFAULT 'platform' COMMENT 'Who handles delivery: platform agent, seller, or buyer pickup',
  ADD COLUMN IF NOT EXISTS seller_can_deliver BOOLEAN DEFAULT FALSE COMMENT 'Seller opted to deliver this order',
  ADD COLUMN IF NOT EXISTS qr_code VARCHAR(64) NULL COMMENT 'Unique QR code for order verification',
  ADD COLUMN IF NOT EXISTS qr_code_hash VARCHAR(255) NULL COMMENT 'Hashed QR code for verification',
  ADD COLUMN IF NOT EXISTS delivery_otp_hash VARCHAR(255) NULL COMMENT 'Hashed OTP for delivery verification',
  ADD COLUMN IF NOT EXISTS delivery_otp_expires_at DATETIME NULL COMMENT 'OTP expiration timestamp',
  ADD COLUMN IF NOT EXISTS assigned_agent_id CHAR(36) NULL COMMENT 'Assigned delivery agent',
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL COMMENT 'When order was approved for delivery',
  ADD COLUMN IF NOT EXISTS approved_by CHAR(36) NULL COMMENT 'Admin who approved the order',
  ADD COLUMN IF NOT EXISTS picked_up_at DATETIME NULL COMMENT 'When agent picked up from seller',
  ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL COMMENT 'When order was delivered',
  ADD COLUMN IF NOT EXISTS seller_location_lat DECIMAL(10, 8) NULL COMMENT 'Seller pickup latitude',
  ADD COLUMN IF NOT EXISTS seller_location_lng DECIMAL(11, 8) NULL COMMENT 'Seller pickup longitude',
  ADD COLUMN IF NOT EXISTS buyer_location_lat DECIMAL(10, 8) NULL COMMENT 'Buyer delivery latitude',
  ADD COLUMN IF NOT EXISTS buyer_location_lng DECIMAL(11, 8) NULL COMMENT 'Buyer delivery longitude';

-- Add foreign key for assigned agent
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_assigned_agent 
  FOREIGN KEY (assigned_agent_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add foreign key for approved_by
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_approved_by 
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add agent location tracking fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8) NULL COMMENT 'Agent current latitude',
  ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8) NULL COMMENT 'Agent current longitude',
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE COMMENT 'Agent availability status',
  ADD COLUMN IF NOT EXISTS last_location_update DATETIME NULL COMMENT 'Last location update timestamp',
  ADD COLUMN IF NOT EXISTS max_delivery_radius_km DECIMAL(5, 2) DEFAULT 10.00 COMMENT 'Max delivery radius in km';

-- Create index for nearby agent queries
CREATE INDEX IF NOT EXISTS idx_users_agent_location ON users(current_lat, current_lng, is_online);

-- Create index for order delivery queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(order_status, delivery_type, assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_location ON orders(buyer_location_lat, buyer_location_lng);

-- Update deliveries table to link with enhanced order system
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at DATETIME NULL COMMENT 'When agent confirmed pickup',
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at DATETIME NULL COMMENT 'When delivery was verified',
  ADD COLUMN IF NOT EXISTS verification_method ENUM('qr', 'otp') NULL COMMENT 'How delivery was verified',
  ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6, 2) NULL COMMENT 'Calculated delivery distance';
