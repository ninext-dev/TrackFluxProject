/*
  # Add RLS policies for classifications table

  1. Security Changes
    - Enable RLS on classifications table
    - Add policies for:
      - Admin users can manage all classifications
      - Authenticated users can read classifications
*/

-- Enable RLS
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Admin users can manage all classifications
CREATE POLICY "Admin users can manage classifications" 
ON classifications 
FOR ALL 
TO authenticated
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@reforpan.com'
)
WITH CHECK (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@reforpan.com'
);

-- Users can read classifications
CREATE POLICY "Users can read classifications" 
ON classifications 
FOR SELECT 
TO authenticated
USING (true);