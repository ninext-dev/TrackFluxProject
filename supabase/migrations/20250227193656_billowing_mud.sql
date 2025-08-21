/*
  # Update formulation validation for intermediate products

  1. Changes
    - Modify the validate_formulation_item function to allow intermediate products to have their own formulations
    - Allow intermediate products to be used in other formulations
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