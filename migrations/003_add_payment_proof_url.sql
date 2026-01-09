-- Payment Proof URL Migration
-- Adds payment_proof_url column to orders table for screenshot uploads

-- Add payment_proof_url column to orders table
ALTER TABLE orders
ADD COLUMN payment_proof_url VARCHAR(500) NULL 
COMMENT 'URL to payment screenshot/proof image' 
AFTER order_status;

