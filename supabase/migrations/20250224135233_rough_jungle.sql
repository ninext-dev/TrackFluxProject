/*
  # Fix permissions and policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Recreate policies for anonymous access
    - Ensure consistent permissions across tables

  2. Security
    - Allow anonymous access for all operations
    - Maintain data integrity while allowing open access
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous access to productions" ON productions;
DROP POLICY IF EXISTS "Allow anonymous access to production_days" ON production_days;
DROP POLICY IF EXISTS "Allow anonymous access to user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "Allow anonymous access to products" ON products;
DROP POLICY IF EXISTS "Allow anonymous access to formulations" ON formulations;
DROP POLICY IF EXISTS "Allow anonymous access to formulation_items" ON formulation_items;

-- Create new policies for anonymous access
CREATE POLICY "Enable anonymous access to productions"
  ON productions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable anonymous access to production_days"
  ON production_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable anonymous access to user_permissions"
  ON user_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Enable anonymous access to products"
  ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable anonymous access to formulations"
  ON formulations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable anonymous access to formulation_items"
  ON formulation_items
  FOR ALL
  USING (true)
  WITH CHECK (true);