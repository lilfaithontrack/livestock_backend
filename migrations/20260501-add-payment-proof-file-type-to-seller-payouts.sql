-- Adds MIME type field for withdrawal payment proof evidence uploads.
-- Supports screenshot or PDF evidence tracking.

ALTER TABLE seller_payouts
ADD COLUMN IF NOT EXISTS payment_proof_file_type VARCHAR(100) NULL
COMMENT 'MIME type for uploaded payment proof (image/pdf)'
AFTER payment_proof_url;
