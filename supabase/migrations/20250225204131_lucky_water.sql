/*
  # Add user classes and banning functionality

  1. Changes
    - Add user class column to user_profiles
    - Add banning functionality columns
    - Create user class enum type
    - Add default values for existing users

  2. Security
    - Only admin can modify user classes and banning
*/

-- Create user class enum
DO $$ BEGIN
  CREATE TYPE user_class AS ENUM ('ADMIN', 'STAFF', 'NORMAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_class user_class NOT NULL DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS banned_until timestamptz,
ADD COLUMN IF NOT EXISTS ban_reason text;

-- Update existing users with their classes
UPDATE user_profiles 
SET user_class = 'ADMIN' 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'admin@reforpan.com'
);

UPDATE user_profiles 
SET user_class = 'STAFF' 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('matheus@reforpan.com', 'gustavo@reforpan.com')
);

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION auth.check_user_banned()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND banned_until > CURRENT_TIMESTAMP
  ) THEN
    RAISE EXCEPTION 'User is banned';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check ban status on every request
DROP TRIGGER IF EXISTS check_user_banned ON auth.users;
CREATE TRIGGER check_user_banned
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.check_user_banned();