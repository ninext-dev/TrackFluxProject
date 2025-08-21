/*
  # Fix Classifications RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Create new policies that allow authenticated users to read all classifications
    - Create new policies that allow admin users to manage all classifications
    - Enable RLS on classifications table

  2. Security
    - All authenticated users can read classifications
    - Only admin users can create/update/delete classifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read classifications" ON classifications;
DROP POLICY IF EXISTS "Admin users can manage classifications" ON classifications;
DROP POLICY IF EXISTS "Enable read access for all users" ON classifications;
DROP POLICY IF EXISTS "Enable write access for admin users" ON classifications;

-- Enable RLS
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can read classifications"
  ON classifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage all classifications"
  ON classifications
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@reforpan.com')
  WITH CHECK (auth.email() = 'admin@reforpan.com');