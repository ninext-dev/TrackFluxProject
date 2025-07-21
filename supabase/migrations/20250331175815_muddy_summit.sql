/*
  # Change batches column type to numeric

  1. Changes
    - Modify the data type of batches column in productions table from integer to numeric
    - This allows decimal values to be stored (e.g., 0.5 batches)

  2. Reason
    - Support partial batches for more accurate production calculations
    - Fix error when trying to save decimal values like "0.5" as batches
*/

-- Change batches column type from integer to numeric
ALTER TABLE productions
ALTER COLUMN batches TYPE numeric;