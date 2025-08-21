/*
  # Add Production Photos Support

  1. New Tables
    - `production_photos`
      - `id` (uuid, primary key)
      - `production_id` (uuid, references productions)
      - `url` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `production_photos` table
    - Add policy for anonymous access
*/

-- Create production_photos table
CREATE TABLE production_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid REFERENCES productions(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE production_photos ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access
CREATE POLICY "Enable anonymous access to production_photos"
  ON production_photos
  FOR ALL
  USING (true)
  WITH CHECK (true);