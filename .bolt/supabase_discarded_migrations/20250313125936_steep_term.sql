/*
  # Add physical address to products

  1. Changes
    - Add physical_address column to products table
    - This column will store the physical location of ink and film products
    - The column is nullable since not all products require a physical address

  2. Notes
    - Used by ink and film products in the graphics department
    - Displayed in the graphics production interface
*/

-- Add physical_address column
ALTER TABLE products 
ADD COLUMN physical_address text;