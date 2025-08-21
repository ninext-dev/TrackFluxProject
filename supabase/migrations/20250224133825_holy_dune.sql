/*
  # User Management System

  1. New Tables
    - `user_permissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `module` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_permissions` table
    - Add policies for admin access
*/

-- Create user_permissions table
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can manage all permissions"
  ON user_permissions
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

CREATE POLICY "Users can view their own permissions"
  ON user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);