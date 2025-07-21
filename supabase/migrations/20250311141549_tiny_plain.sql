/*
  # Update unit of measure to use text type

  1. Changes
    - Change unit_of_measure column from enum to text type
    - This allows the column to accept any value from the classifications table
    
  2. Rationale
    - More flexible solution that allows adding new units through classifications
    - Maintains data integrity through foreign key relationship
    - Allows for dynamic unit management without schema changes
*/

-- Change unit_of_measure column from enum to text
ALTER TABLE products 
ALTER COLUMN unit_of_measure TYPE text;