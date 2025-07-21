/*
  # Production Diary Schema

  1. New Tables
    - `production_days`
      - `id` (uuid, primary key)
      - `date` (date)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)
      
    - `productions`
      - `id` (uuid, primary key)
      - `production_day_id` (uuid, references production_days)
      - `product_name` (text)
      - `batch_number` (text)
      - `expiry_date` (date)
      - `batches` (integer)
      - `quantity` (numeric)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create production_days table
CREATE TABLE production_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  UNIQUE(date, user_id)
);

-- Create productions table
CREATE TABLE productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_day_id uuid REFERENCES production_days(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  batches integer NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE production_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;

-- Policies for production_days
CREATE POLICY "Users can view their own production days"
  ON production_days
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own production days"
  ON production_days
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own production days"
  ON production_days
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own production days"
  ON production_days
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for productions
CREATE POLICY "Users can view their own productions"
  ON productions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own productions"
  ON productions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productions"
  ON productions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own productions"
  ON productions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for productions
CREATE TRIGGER update_productions_updated_at
  BEFORE UPDATE ON productions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();