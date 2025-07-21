/*
  # Create classifications table

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
*/

CREATE TABLE IF NOT EXISTS classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('UNIT', 'DEPARTMENT', 'BRAND', 'PRODUCT_TYPE')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read classifications"
  ON classifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage classifications"
  ON classifications
  USING (auth.email() = 'admin@reforpan.com')
  WITH CHECK (auth.email() = 'admin@reforpan.com');

-- Add department_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES classifications(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS classifications_type_idx ON classifications(type);
CREATE INDEX IF NOT EXISTS classifications_name_idx ON classifications(name);