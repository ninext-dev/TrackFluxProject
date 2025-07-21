/*
  # Add physical address to products

  1. Changes
    - Add physical_address column to products table
    - This field will store the physical location of inks and films in the warehouse
    
  2. Notes
    - Only used for products in MP Tinta Gráfica and MP Filme Gráfica departments
*/

-- Add physical_address column
ALTER TABLE products 
ADD COLUMN physical_address text;