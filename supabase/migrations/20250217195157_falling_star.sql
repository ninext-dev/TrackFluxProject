/*
  # Allow Anonymous Access

  1. Changes
    - Drop existing RLS policies
    - Create new policies allowing anonymous access
    - Update user_id constraints

  2. Security
    - Allow read/write access without authentication
    - Remove user_id restrictions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own production days" ON production_days;
DROP POLICY IF EXISTS "Users can insert their own production days" ON production_days;
DROP POLICY IF EXISTS "Users can update their own production days" ON production_days;
DROP POLICY IF EXISTS "Users can delete their own production days" ON production_days;

DROP POLICY IF EXISTS "Users can view their own productions" ON productions;
DROP POLICY IF EXISTS "Users can insert their own productions" ON productions;
DROP POLICY IF EXISTS "Users can update their own productions" ON productions;
DROP POLICY IF EXISTS "Users can delete their own productions" ON productions;

-- Alter tables to allow null user_id
ALTER TABLE production_days ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE productions ALTER COLUMN user_id DROP NOT NULL;

-- Create new policies for production_days
CREATE POLICY "Allow anonymous access to production_days"
  ON production_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create new policies for productions
CREATE POLICY "Allow anonymous access to productions"
  ON productions
  FOR ALL
  USING (true)
  WITH CHECK (true);