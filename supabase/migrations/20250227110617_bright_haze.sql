/*
  # Add admin policy for user_profiles table

  1. Changes
    - Add policy allowing admin users to manage all user profiles
    - This fixes the 403 error when creating/updating users
*/

-- Create policy for admin users to manage all user profiles
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