/*
  # Allow intermediate products in formulations

  1. Changes
     - Update validation function to allow intermediate products to have their own formulations
     - Maintain ability for intermediate products to be used as ingredients in recipes
*/

-- Update the validation function to allow intermediate products to have formulations
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