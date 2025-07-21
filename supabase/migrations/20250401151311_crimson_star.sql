/*
  # Add avatar URL to user profiles

  1. Changes
    - Add avatar_url column to user_profiles table
    - This allows users to store their profile picture URLs
    
  2. Notes
    - Column is nullable since not all users will have an avatar
    - URLs will point to images stored in Supabase storage
*/

-- Add avatar_url column
ALTER TABLE user_profiles 
ADD COLUMN avatar_url text;