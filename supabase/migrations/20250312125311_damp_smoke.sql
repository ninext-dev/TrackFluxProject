/*
  # Graphics Production Schema

  1. New Tables
    - `graphics_productions`
      - `id` (uuid, primary key)
      - `production_day_id` (uuid, references production_days)
      - `product_id` (uuid, references products)
      - `quantity` (numeric)
      - `status` (text)
      - `billing_status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `cmv_value` (numeric)
      - `unit_cost` (numeric)
      - `total_cost` (numeric)

    - `graphics_production_inks`
      - `id` (uuid, primary key)
      - `graphics_production_id` (uuid, references graphics_productions)
      - `ink_id` (uuid, references products)
      - `quantity` (numeric)
      - `created_at` (timestamp)

    - `graphics_production_films`
      - `id` (uuid, primary key)
      - `graphics_production_id` (uuid, references graphics_productions)
      - `film_id` (uuid, references products)
      - `quantity` (numeric)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous access
*/

-- Create graphics_productions table
CREATE TABLE graphics_productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_day_id uuid REFERENCES production_days(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  billing_status text NOT NULL DEFAULT 'NOT_BILLED' CHECK (billing_status IN ('NOT_BILLED', 'BILLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cmv_value numeric,
  unit_cost numeric,
  total_cost numeric
);

-- Create graphics_production_inks table
CREATE TABLE graphics_production_inks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graphics_production_id uuid REFERENCES graphics_productions(id) ON DELETE CASCADE NOT NULL,
  ink_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create graphics_production_films table
CREATE TABLE graphics_production_films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graphics_production_id uuid REFERENCES graphics_productions(id) ON DELETE CASCADE NOT NULL,
  film_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE graphics_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphics_production_inks ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphics_production_films ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable anonymous access to graphics_productions"
  ON graphics_productions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable anonymous access to graphics_production_inks"
  ON graphics_production_inks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable anonymous access to graphics_production_films"
  ON graphics_production_films
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger for graphics_productions
CREATE TRIGGER update_graphics_productions_updated_at
  BEFORE UPDATE ON graphics_productions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();