/*
  # User Permissions Setup

  1. Changes
    - Create user_permissions table if it doesn't exist
    - Enable RLS
    - Create policies for admin and user access
*/

-- Create user_permissions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_permissions'
  ) THEN
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
  END IF;
END
$$;