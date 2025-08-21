/*
  # Fix classifications handling

  1. Changes
    - Drop existing unique constraints on classifications
    - Add unique constraint on name and type combination
    - This ensures we can have the same name in different types
    - But prevents duplicates within the same type

  2. Security
    - Maintain existing RLS policies
    - Keep data integrity with proper constraints
*/

-- Add unique constraint for name within each type
ALTER TABLE classifications 
DROP CONSTRAINT IF EXISTS classifications_name_type_unique;

CREATE UNIQUE INDEX IF NOT EXISTS classifications_name_type_unique 
ON classifications (type, name);