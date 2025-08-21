/*
  # Remove unique code per day constraint

  1. Changes
    - Remove the unique constraint `unique_code_per_day` from the productions table
    - This allows multiple productions of the same product in a single day

  2. Reason
    - Users need to be able to add multiple productions of the same product in a single day
    - The previous constraint was too restrictive for real-world use cases
*/

ALTER TABLE productions
DROP CONSTRAINT IF EXISTS unique_code_per_day;