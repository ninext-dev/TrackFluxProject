/*
  # Add Unit of Measure and Formulation Tables

  1. New Types
    - unit_of_measure: Enum for product measurement units
    - formulation_type: Enum for formulation item types

  2. New Tables
    - formulations: Stores product formulations
    - formulation_items: Stores recipe and packaging items
    
  3. Security
    - Enable RLS on new tables
    - Add policies for anonymous access
*/

-- Create enums
CREATE TYPE unit_of_measure AS ENUM ('KG', 'UN', 'L');
CREATE TYPE formulation_type AS ENUM ('RECIPE', 'PACKAGING');

-- Add unit_of_measure to products table
ALTER TABLE products
ADD COLUMN unit_of_measure unit_of_measure NOT NULL DEFAULT 'UN';

-- Create formulations table
CREATE TABLE formulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create formulation_items table (for both recipe and packaging items)
CREATE TABLE formulation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id uuid REFERENCES formulations(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  item_type formulation_type NOT NULL,
  integer_quantity numeric NOT NULL DEFAULT 0,
  weight_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE formulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulation_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow anonymous access to formulations"
  ON formulations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous access to formulation_items"
  ON formulation_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to validate product types
CREATE OR REPLACE FUNCTION validate_formulation_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the product exists and has the correct type
  IF NEW.item_type = 'RECIPE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id 
      AND product_type IN ('RAW_MATERIAL', 'INTERMEDIATE_PRODUCT')
    ) THEN
      RAISE EXCEPTION 'Recipe items must be RAW_MATERIAL or INTERMEDIATE_PRODUCT';
    END IF;
  ELSIF NEW.item_type = 'PACKAGING' THEN
    IF NOT EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id 
      AND product_type = 'PACKAGING'
    ) THEN
      RAISE EXCEPTION 'Packaging items must be of type PACKAGING';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for formulation items validation
CREATE TRIGGER validate_formulation_item_trigger
  BEFORE INSERT OR UPDATE ON formulation_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_formulation_item();

-- Add triggers for updated_at
CREATE TRIGGER update_formulations_updated_at
  BEFORE UPDATE ON formulations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_formulation_items_updated_at
  BEFORE UPDATE ON formulation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();