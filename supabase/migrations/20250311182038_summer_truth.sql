/*
  # Add yield field to formulations

  1. Changes
    - Add yield field to formulations table
    - Migrate description data to yield field
    - Remove description field

  2. Notes
    - The yield field stores the expected output quantity for the formulation
*/

-- Add new yield column
ALTER TABLE formulations ADD COLUMN yield text;

-- Drop description column
ALTER TABLE formulations DROP COLUMN description;