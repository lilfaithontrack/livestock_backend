-- KYC Documents Migration
-- Adds fields for seller KYC document uploads (trade license, national ID front/back)

-- Add KYC document fields to users table
ALTER TABLE users
ADD COLUMN trade_license_url VARCHAR(500) NULL 
COMMENT 'URL to trade license document' 
AFTER kyc_status,

ADD COLUMN national_id_front_url VARCHAR(500) NULL 
COMMENT 'URL to national ID or Kebele ID front side' 
AFTER trade_license_url,

ADD COLUMN national_id_back_url VARCHAR(500) NULL 
COMMENT 'URL to national ID or Kebele ID back side' 
AFTER national_id_front_url,

ADD COLUMN kyc_submitted_at TIMESTAMP NULL 
COMMENT 'Timestamp when KYC documents were submitted' 
AFTER national_id_back_url,

ADD COLUMN kyc_reviewed_at TIMESTAMP NULL 
COMMENT 'Timestamp when admin reviewed KYC documents' 
AFTER kyc_submitted_at,

ADD COLUMN kyc_rejection_reason TEXT NULL 
COMMENT 'Reason for KYC rejection if applicable' 
AFTER kyc_reviewed_at;

