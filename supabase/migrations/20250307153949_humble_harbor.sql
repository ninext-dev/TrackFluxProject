/*
  # Create classifications table and related schema changes

  1. New Tables
    - `classifications`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `type` (text, not null)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `classifications` table
    - Add policy for authenticated users to read all classifications
    - Add policy for admin users to manage classifications

  3. Changes
    - Add department_id to products table
    - Add indexes for performance
*/

-- Create classifications table
CREATE TABLE IF NOT EXISTS classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('UNIT', 'DEPARTMENT', 'BRAND', 'PRODUCT_TYPE')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read classifications"
  ON classifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage classifications"
  ON classifications
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@reforpan.com')
  WITH CHECK (auth.email() = 'admin@reforpan.com');

-- Add department_id to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES classifications(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS classifications_type_idx ON classifications(type);
CREATE INDEX IF NOT EXISTS classifications_name_idx ON classifications(name);
CREATE INDEX IF NOT EXISTS products_department_id_idx ON products(department_id);

-- Insert default classifications
INSERT INTO classifications (name, type) VALUES
-- Units
('KG', 'UNIT'),
('UN', 'UNIT'),
('L', 'UNIT'),
-- Departments
('Padaria', 'DEPARTMENT'),
('Confeitaria', 'DEPARTMENT'),
('Salgados', 'DEPARTMENT'),
-- Product Types
('Produto Acabado', 'PRODUCT_TYPE'),
('Matéria Prima', 'PRODUCT_TYPE'),
('Produto Intermediário', 'PRODUCT_TYPE'),
('Embalagem', 'PRODUCT_TYPE')
ON CONFLICT DO NOTHING;