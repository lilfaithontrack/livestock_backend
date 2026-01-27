-- Migration: Add order tracking to qercha_participants
-- Date: 2026-01-28

-- Add order_id column
ALTER TABLE qercha_participants 
ADD COLUMN order_id CHAR(36) NULL 
COMMENT 'Order created when joining qercha package';

-- Add foreign key constraint
ALTER TABLE qercha_participants 
ADD CONSTRAINT fk_qercha_participants_order 
FOREIGN KEY (order_id) REFERENCES orders(order_id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Add payment_status column
ALTER TABLE qercha_participants 
ADD COLUMN payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') 
NOT NULL DEFAULT 'Pending' 
COMMENT 'Payment status for this qercha participation';

-- Add index for faster order lookups
CREATE INDEX idx_qercha_participants_order_id ON qercha_participants(order_id);
