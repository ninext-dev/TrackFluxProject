/*
  # Fix product enums and classifications

  1. Changes
    - Add new values to unit_of_measure enum
    - Update RLS policies for classifications table
    - Add default classifications for units and product types

  2. Security
    - Enable RLS on classifications table
    - Add policies for authenticated users
*/

-- Add PCT to unit_of_measure enum if it doesn't exist
DO $$ 
BEGIN 
  ALTER TYPE unit_of_measure ADD VALUE 'PCT' AFTER 'L';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enable RLS on classifications
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for classifications
CREATE POLICY "Enable read access for all users"
  ON classifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write access for admin users"
  ON classifications
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@reforpan.com')
  WITH CHECK (auth.email() = 'admin@reforpan.com');

-- Insert default classifications if they don't exist
INSERT INTO classifications (name, type)
SELECT 'KG', 'UNIT'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'KG' AND type = 'UNIT');

INSERT INTO classifications (name, type)
SELECT 'UN', 'UNIT'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'UN' AND type = 'UNIT');

INSERT INTO classifications (name, type)
SELECT 'L', 'UNIT'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'L' AND type = 'UNIT');

INSERT INTO classifications (name, type)
SELECT 'PCT', 'UNIT'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'PCT' AND type = 'UNIT');

INSERT INTO classifications (name, type)
SELECT 'FINISHED_PRODUCT', 'PRODUCT_TYPE'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'FINISHED_PRODUCT' AND type = 'PRODUCT_TYPE');

INSERT INTO classifications (name, type)
SELECT 'RAW_MATERIAL', 'PRODUCT_TYPE'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'RAW_MATERIAL' AND type = 'PRODUCT_TYPE');

INSERT INTO classifications (name, type)
SELECT 'INTERMEDIATE_PRODUCT', 'PRODUCT_TYPE'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'INTERMEDIATE_PRODUCT' AND type = 'PRODUCT_TYPE');

INSERT INTO classifications (name, type)
SELECT 'PACKAGING', 'PRODUCT_TYPE'
WHERE NOT EXISTS (SELECT 1 FROM classifications WHERE name = 'PACKAGING' AND type = 'PRODUCT_TYPE');