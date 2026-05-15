-- Migration: Add metadata_schema column to product_subcategories
-- This field stores dynamic form field definitions for products in each subcategory

ALTER TABLE product_subcategories
ADD COLUMN metadata_schema JSON DEFAULT NULL
COMMENT 'Defines dynamic product form fields for this subcategory. Array of field definitions: [{key, label, type, placeholder, required, options, group}]';
