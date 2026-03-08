-- Migration: Add Seller Delivery Agents System
-- Date: 2026-03-08
-- Description: Creates seller_delivery_agents table and adds seller_delivery_agent_id to deliveries

-- Step 0: Drop table if partially created from previous attempt
DROP TABLE IF EXISTS seller_delivery_agents;

-- Step 1: Create seller_delivery_agents table (matching users table exactly)
CREATE TABLE IF NOT EXISTS seller_delivery_agents (
    agent_id char(36) NOT NULL PRIMARY KEY,
    seller_id char(36) NOT NULL,
    full_name varchar(200) NOT NULL,
    phone varchar(20) NOT NULL,
    email varchar(200) NULL,
    national_id varchar(50) NULL,
    vehicle_type enum('motorcycle','bicycle','car','truck','on_foot') DEFAULT 'motorcycle',
    vehicle_plate varchar(20) NULL,
    profile_photo_url varchar(500) NULL,
    is_active tinyint(1) DEFAULT 1,
    is_available tinyint(1) DEFAULT 1,
    current_lat decimal(10,8) NULL,
    current_lng decimal(11,8) NULL,
    total_deliveries int DEFAULT 0,
    rating decimal(3,2) DEFAULT 5.00,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Step 3: Add indexes
CREATE INDEX idx_sda_seller ON seller_delivery_agents(seller_id);
CREATE INDEX idx_sda_active ON seller_delivery_agents(is_active);
CREATE INDEX idx_sda_available ON seller_delivery_agents(is_available);
CREATE INDEX idx_sda_phone ON seller_delivery_agents(phone);

-- Step 4: Add seller_delivery_agent_id column to deliveries table
ALTER TABLE deliveries ADD COLUMN seller_delivery_agent_id char(36) NULL;

