/*
  # Product table updates
  
  1. New Columns
    - Add product_type column with enum type
    - Add is_active column with boolean type
    
  2. Changes
    - Add enum type for product types
    - Set default value for is_active
*/

-- Create enum for product types
CREATE TYPE product_type AS ENUM (
  'FINISHED_PRODUCT',
  'RAW_MATERIAL',
  'INTERMEDIATE_PRODUCT',
  'PACKAGING'
);

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN product_type product_type NOT NULL DEFAULT 'FINISHED_PRODUCT',
ADD COLUMN is_active boolean NOT NULL DEFAULT true;