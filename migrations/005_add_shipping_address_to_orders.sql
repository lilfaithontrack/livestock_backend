-- Add shipping address and checkout info to orders table
-- Migration: 005_add_shipping_address_to_orders.sql

ALTER TABLE orders
ADD COLUMN shipping_address TEXT NULL 
COMMENT 'Full shipping address for the order' 
AFTER payment_proof_url;

ALTER TABLE orders
ADD COLUMN shipping_full_name VARCHAR(255) NULL 
COMMENT 'Full name of the recipient' 
AFTER shipping_address;

ALTER TABLE orders
ADD COLUMN shipping_phone VARCHAR(20) NULL 
COMMENT 'Contact phone for shipping' 
AFTER shipping_full_name;

ALTER TABLE orders
ADD COLUMN shipping_city VARCHAR(100) NULL 
COMMENT 'City for shipping' 
AFTER shipping_phone;

ALTER TABLE orders
ADD COLUMN shipping_region VARCHAR(100) NULL 
COMMENT 'Region/State for shipping' 
AFTER shipping_city;

ALTER TABLE orders
ADD COLUMN shipping_notes TEXT NULL 
COMMENT 'Additional shipping notes or instructions' 
AFTER shipping_region;

