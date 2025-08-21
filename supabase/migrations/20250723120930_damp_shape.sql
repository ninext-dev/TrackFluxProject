/*
  # Base Testing 2025 - Complete Independent Database Schema
  
  This migration creates a complete independent database schema for the test environment.
  It includes all tables, types, functions, and policies needed for the TrackFlux system.
  
  1. Types and Enums
  2. Core Tables
  3. Security Policies
  4. Default Data
  5. Functions and Triggers
*/

-- Create custom types
DO $$ BEGIN
  CREATE TYPE unit_of_measure AS ENUM ('KG', 'UN', 'L', 'PCT', 'CX');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('FINISHED_PRODUCT', 'RAW_MATERIAL', 'INTERMEDIATE_PRODUCT', 'PACKAGING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE formulation_type AS ENUM ('RECIPE', 'PACKAGING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_class AS ENUM ('ADMIN', 'STAFF', 'NORMAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create classifications table
CREATE TABLE IF NOT EXISTS classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('UNIT', 'DEPARTMENT', 'BRAND', 'PRODUCT_TYPE')),
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint for classifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'classifications_name_type_unique'
  ) THEN
    CREATE UNIQUE INDEX classifications_name_type_unique ON classifications (type, name);
  END IF;
END $$;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  brand text NOT NULL,
  product_type product_type NOT NULL DEFAULT 'FINISHED_PRODUCT',
  unit_of_measure text NOT NULL DEFAULT 'UN',
  is_active boolean NOT NULL DEFAULT true,
  department_id uuid REFERENCES classifications(id),
  physical_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create formulations table
CREATE TABLE IF NOT EXISTS formulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  name text NOT NULL,
  yield text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create formulation_items table
CREATE TABLE IF NOT EXISTS formulation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id uuid REFERENCES formulations(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  item_type formulation_type NOT NULL,
  integer_quantity numeric NOT NULL DEFAULT 0,
  weight_quantity numeric NOT NULL DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create production_days table
CREATE TABLE IF NOT EXISTS production_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Add unique constraint for production_days
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'production_days_date_unique'
  ) THEN
    ALTER TABLE production_days ADD CONSTRAINT production_days_date_unique UNIQUE(date);
  END IF;
END $$;

-- Create productions table
CREATE TABLE IF NOT EXISTS productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_day_id uuid REFERENCES production_days(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  code text NOT NULL,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  batches numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 0,
  programmed_quantity numeric NOT NULL DEFAULT 0,
  has_divergence boolean NOT NULL DEFAULT false,
  transaction_number text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PRODUCTION', 'COMPLETED')),
  display_order integer,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Create production_photos table
CREATE TABLE IF NOT EXISTS production_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid REFERENCES productions(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create graphics_production_days table
CREATE TABLE IF NOT EXISTS graphics_production_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Add unique constraint for graphics_production_days
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'graphics_production_days_date_unique'
  ) THEN
    ALTER TABLE graphics_production_days ADD CONSTRAINT graphics_production_days_date_unique UNIQUE(date);
  END IF;
END $$;

-- Create graphics_productions table
CREATE TABLE IF NOT EXISTS graphics_productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graphics_production_day_id uuid REFERENCES graphics_production_days(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  billing_status text NOT NULL DEFAULT 'NOT_BILLED' CHECK (billing_status IN ('NOT_BILLED', 'BILLED')),
  cmv_value numeric,
  unit_cost numeric,
  total_cost numeric,
  invoice_number text,
  billing_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create graphics_production_inks table
CREATE TABLE IF NOT EXISTS graphics_production_inks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graphics_production_id uuid REFERENCES graphics_productions(id) ON DELETE CASCADE NOT NULL,
  ink_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create graphics_production_films table
CREATE TABLE IF NOT EXISTS graphics_production_films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graphics_production_id uuid REFERENCES graphics_productions(id) ON DELETE CASCADE NOT NULL,
  film_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  user_class user_class NOT NULL DEFAULT 'NORMAL',
  banned_until timestamptz,
  ban_reason text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_user_id_unique'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id);
  END IF;
END $$;

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation function for formulation items
CREATE OR REPLACE FUNCTION validate_formulation_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the product exists and has the correct type
  IF NEW.item_type = 'RECIPE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id 
      AND product_type IN ('RAW_MATERIAL', 'INTERMEDIATE_PRODUCT')
    ) THEN
      RAISE EXCEPTION 'Recipe items must be RAW_MATERIAL or INTERMEDIATE_PRODUCT';
    END IF;
  ELSIF NEW.item_type = 'PACKAGING' THEN
    IF NOT EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id 
      AND product_type = 'PACKAGING'
    ) THEN
      RAISE EXCEPTION 'Packaging items must be of type PACKAGING';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_products_updated_at'
  ) THEN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_formulations_updated_at'
  ) THEN
    CREATE TRIGGER update_formulations_updated_at
      BEFORE UPDATE ON formulations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_formulation_items_updated_at'
  ) THEN
    CREATE TRIGGER update_formulation_items_updated_at
      BEFORE UPDATE ON formulation_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_productions_updated_at'
  ) THEN
    CREATE TRIGGER update_productions_updated_at
      BEFORE UPDATE ON productions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_graphics_productions_updated_at'
  ) THEN
    CREATE TRIGGER update_graphics_productions_updated_at
      BEFORE UPDATE ON graphics_productions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Create validation trigger for formulation items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_formulation_item_trigger'
  ) THEN
    CREATE TRIGGER validate_formulation_item_trigger
      BEFORE INSERT OR UPDATE ON formulation_items
      FOR EACH ROW
      EXECUTE FUNCTION validate_formulation_item();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS classifications_type_idx ON classifications(type);
CREATE INDEX IF NOT EXISTS classifications_name_idx ON classifications(name);
CREATE INDEX IF NOT EXISTS products_department_id_idx ON products(department_id);
CREATE INDEX IF NOT EXISTS formulation_items_position_idx ON formulation_items (formulation_id, item_type, position);
CREATE INDEX IF NOT EXISTS productions_display_order_idx ON productions (production_day_id, display_order);

-- Enable RLS on all tables
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphics_production_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphics_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphics_production_inks ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphics_production_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read classifications" ON classifications;
DROP POLICY IF EXISTS "Users with products permission can manage classifications" ON classifications;
DROP POLICY IF EXISTS "Enable anonymous access to products" ON products;
DROP POLICY IF EXISTS "Enable anonymous access to formulations" ON formulations;
DROP POLICY IF EXISTS "Enable anonymous access to formulation_items" ON formulation_items;
DROP POLICY IF EXISTS "Enable anonymous access to production_days" ON production_days;
DROP POLICY IF EXISTS "Enable anonymous access to productions" ON productions;
DROP POLICY IF EXISTS "Enable anonymous access to production_photos" ON production_photos;
DROP POLICY IF EXISTS "Enable anonymous access to graphics_production_days" ON graphics_production_days;
DROP POLICY IF EXISTS "Enable anonymous access to graphics_productions" ON graphics_productions;
DROP POLICY IF EXISTS "Enable anonymous access to graphics_production_inks" ON graphics_production_inks;
DROP POLICY IF EXISTS "Enable anonymous access to graphics_production_films" ON graphics_production_films;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can manage all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable anonymous access to user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can manage all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Enable anonymous access to user_permissions" ON user_permissions;

-- Create RLS policies for classifications
CREATE POLICY "Users can read classifications"
  ON classifications
  FOR SELECT
  USING (true);

CREATE POLICY "Users with products permission can manage classifications"
  ON classifications
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE module = 'products'
      UNION
      SELECT id FROM auth.users 
      WHERE email = 'admin@reforpan.com'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE module = 'products'
      UNION
      SELECT id FROM auth.users 
      WHERE email = 'admin@reforpan.com'
    )
  );

-- Create RLS policies for products
CREATE POLICY "Enable anonymous access to products"
  ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for formulations
CREATE POLICY "Enable anonymous access to formulations"
  ON formulations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for formulation_items
CREATE POLICY "Enable anonymous access to formulation_items"
  ON formulation_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for production_days
CREATE POLICY "Enable anonymous access to production_days"
  ON production_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for productions
CREATE POLICY "Enable anonymous access to productions"
  ON productions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for production_photos
CREATE POLICY "Enable anonymous access to production_photos"
  ON production_photos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for graphics_production_days
CREATE POLICY "Enable anonymous access to graphics_production_days"
  ON graphics_production_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for graphics_productions
CREATE POLICY "Enable anonymous access to graphics_productions"
  ON graphics_productions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for graphics_production_inks
CREATE POLICY "Enable anonymous access to graphics_production_inks"
  ON graphics_production_inks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for graphics_production_films
CREATE POLICY "Enable anonymous access to graphics_production_films"
  ON graphics_production_films
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_profiles
CREATE POLICY "Enable read access for all authenticated users"
  ON user_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "Enable anonymous access to user profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Create RLS policies for user_permissions
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

CREATE POLICY "Enable anonymous access to user_permissions"
  ON user_permissions
  FOR SELECT
  USING (true);

-- Insert default classifications
INSERT INTO classifications (name, type) VALUES
-- Units
('KG', 'UNIT'),
('UN', 'UNIT'),
('L', 'UNIT'),
('PCT', 'UNIT'),
('CX', 'UNIT'),
-- Departments
('Padaria', 'DEPARTMENT'),
('Confeitaria', 'DEPARTMENT'),
('Salgados', 'DEPARTMENT'),
('PA Gráfica', 'DEPARTMENT'),
('MP Tinta Gráfica', 'DEPARTMENT'),
('MP Filme Gráfica', 'DEPARTMENT'),
-- Brands
('Lejor', 'BRAND'),
('Reforpan', 'BRAND'),
-- Product Types
('Produto Acabado', 'PRODUCT_TYPE'),
('Matéria Prima', 'PRODUCT_TYPE'),
('Produto Intermediário', 'PRODUCT_TYPE'),
('Embalagem', 'PRODUCT_TYPE')
ON CONFLICT (type, name) DO NOTHING;