ALTER TABLE qercha_participants 
ADD COLUMN payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending' AFTER amount_paid;
