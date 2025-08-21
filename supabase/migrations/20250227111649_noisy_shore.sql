/*
  # Fix User Profiles Access

  1. Changes
     - Add policy for users to view all user profiles
     - Fix permission denied errors for user profiles table
     - Ensure proper access to user profiles for authentication flows
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can manage all user profiles" ON user_profiles;

-- Create new policies with proper access
CREATE POLICY "Enable read access for all authenticated users"
  ON user_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin users can manage all user profiles"
  ON user_profiles
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

-- Enable anonymous access for authentication flows
CREATE POLICY "Enable anonymous access to user profiles"
  ON user_profiles
  FOR SELECT
  USING (true);