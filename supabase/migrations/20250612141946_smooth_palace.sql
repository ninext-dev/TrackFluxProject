/*
  # Add display order to productions table

  1. Changes
    - Add display_order column to productions table
    - This allows custom ordering of productions within a day
    - Default value is null to maintain existing behavior

  2. Notes
    - Productions with null display_order will be ordered by created_at
    - Productions with display_order will be ordered first, then by display_order value
*/

-- Add display_order column
ALTER TABLE productions 
ADD COLUMN display_order integer;

-- Create index for better performance when ordering
CREATE INDEX IF NOT EXISTS productions_display_order_idx 
ON productions (production_day_id, display_order);