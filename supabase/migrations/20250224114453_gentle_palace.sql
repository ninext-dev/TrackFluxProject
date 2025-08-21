/*
  # Add quantity tracking to productions table

  1. Changes
    - Add `programmed_quantity` column to track initial quantity
    - Add `has_divergence` column to flag quantity changes
    - Set default values for existing records

  2. Notes
    - All existing records will have programmed_quantity set to their current quantity
    - has_divergence will be initially set to false for all records
*/

-- Add new columns with appropriate defaults
ALTER TABLE productions
ADD COLUMN programmed_quantity numeric NOT NULL DEFAULT 0,
ADD COLUMN has_divergence boolean NOT NULL DEFAULT false;

-- Update existing records to set programmed_quantity to current quantity
UPDATE productions
SET programmed_quantity = quantity
WHERE programmed_quantity = 0;