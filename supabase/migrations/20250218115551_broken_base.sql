/*
  # Add product code and status tracking

  1. Changes
    - Add `code` column to productions table
    - Add `transaction_number` column to productions table
    - Add `status` column to productions table
    - Add check constraint for status values

  2. Notes
    - Status can be: 'PENDING', 'IN_PRODUCTION', 'COMPLETED'
    - Code is required and must be unique within a production day
*/

-- Add new columns to productions table
ALTER TABLE productions
ADD COLUMN code text NOT NULL DEFAULT '',
ADD COLUMN transaction_number text,
ADD COLUMN status text NOT NULL DEFAULT 'PENDING'
CHECK (status IN ('PENDING', 'IN_PRODUCTION', 'COMPLETED'));

-- Create unique constraint for code within a production day
ALTER TABLE productions
ADD CONSTRAINT unique_code_per_day UNIQUE (production_day_id, code);