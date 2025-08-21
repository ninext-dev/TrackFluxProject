/*
  # Graphics Production Days Table

  1. New Tables
    - `graphics_production_days`
      - `id` (uuid, primary key)
      - `date` (date)
      - `created_at` (timestamp)
      - `user_id` (uuid)

  2. Changes
    - Update graphics_productions to reference graphics_production_days
    - Add unique constraint on date

  3. Security
    - Enable RLS on graphics_production_days table
    - Add policies for anonymous access
*/

-- Create graphics_production_days table
CREATE TABLE graphics_production_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000',
  UNIQUE(date)
);

-- Enable RLS
ALTER TABLE graphics_production_days ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable anonymous access to graphics_production_days"
  ON graphics_production_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update graphics_productions table
ALTER TABLE graphics_productions
DROP CONSTRAINT graphics_productions_production_day_id_fkey,
ADD COLUMN graphics_production_day_id uuid REFERENCES graphics_production_days(id) ON DELETE CASCADE,
DROP COLUMN production_day_id;