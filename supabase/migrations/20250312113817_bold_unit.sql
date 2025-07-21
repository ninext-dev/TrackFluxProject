/*
  # Fix Classifications RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies that allow proper access
    - Fix admin access using auth.uid() instead of auth.email()

  2. Security
    - Allow read access for all authenticated users
    - Allow admin to manage all classifications
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

CREATE POLICY "Admin users can manage all classifications"
  ON classifications
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email = 'admin@reforpan.com'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email = 'admin@reforpan.com'
    )
  );