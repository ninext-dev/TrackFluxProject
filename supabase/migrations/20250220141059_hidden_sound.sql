/*
  # Create products table and update productions

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `brand` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add foreign key to productions table referencing products
    
  3. Security
    - Enable RLS on products table
    - Add policies for anonymous access
*/

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  brand text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Allow anonymous access to products"
  ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add foreign key to productions
ALTER TABLE productions
ADD COLUMN product_id uuid REFERENCES products(id);