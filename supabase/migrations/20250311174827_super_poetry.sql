/*
  # Add position column to formulation_items

  1. Changes
    - Add position column to formulation_items table to support drag and drop reordering
    - Default position to 0 for existing items
*/

-- Add position column with default value
ALTER TABLE formulation_items ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Create index for faster position-based queries
CREATE INDEX IF NOT EXISTS formulation_items_position_idx ON formulation_items (formulation_id, item_type, position);