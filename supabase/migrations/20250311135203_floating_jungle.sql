/*
  # Add CX unit of measure

  1. Changes
    - Add 'CX' (box) as a valid value for unit_of_measure enum

  2. Notes
    - This allows products to use CX as their unit of measure
    - Existing data is not affected
*/

ALTER TYPE unit_of_measure ADD VALUE IF NOT EXISTS 'CX';