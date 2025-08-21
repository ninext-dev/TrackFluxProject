/*
  # Remove User Foreign Key Constraints

  1. Changes
    - Remove foreign key constraints for user_id columns
    - Update table definitions to work without authentication

  2. Security
    - Remove dependency on auth.users table
    - Allow fully anonymous access
*/

-- Remove foreign key constraints
ALTER TABLE production_days
  DROP CONSTRAINT IF EXISTS production_days_user_id_fkey;

ALTER TABLE productions
  DROP CONSTRAINT IF EXISTS productions_user_id_fkey;

-- Set default user_id for existing records
UPDATE production_days
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id IS NULL;

UPDATE productions
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id IS NULL;