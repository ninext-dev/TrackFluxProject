/*
  # Update Classifications Permissions

  1. Changes
    - Allow users with products permission to manage classifications
    - Maintain read access for all users
    - Remove admin-only restriction

  2. Security
    - Enable RLS on classifications table
    - Allow all users to read classifications
    - Allow users with products permission to manage classifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read classifications" ON classifications;
DROP POLICY IF EXISTS "Admin users can manage classifications" ON classifications;
DROP POLICY IF EXISTS "Enable read access for all users" ON classifications;
DROP POLICY IF EXISTS "Enable write access for admin users" ON classifications;
DROP POLICY IF EXISTS "Admin users can manage all classifications" ON classifications;

-- Enable RLS
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can read classifications"
  ON classifications
  FOR SELECT
  USING (true);

CREATE POLICY "Users with products permission can manage classifications"
  ON classifications
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE module = 'products'
      UNION
      SELECT id FROM auth.users 
      WHERE email = 'admin@reforpan.com'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE module = 'products'
      UNION
      SELECT id FROM auth.users 
      WHERE email = 'admin@reforpan.com'
    )
  );