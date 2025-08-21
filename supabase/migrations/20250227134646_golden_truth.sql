/*
  # Add position column to formulation_items

  1. Changes
    - Add position column to formulation_items table to support drag-and-drop reordering
    - Set default position values for existing records
    - Add index on position column for better performance

  2. Notes
    - The position column allows items to be displayed in a specific order
    - Default values are assigned based on the item's ID to maintain consistency
*/

-- Add position column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'formulation_items'
    AND column_name = 'position'
  ) THEN
    ALTER TABLE formulation_items ADD COLUMN position integer;
    
    -- Set default positions for existing records based on ID order
    WITH indexed_items AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY formulation_id, item_type 
        ORDER BY id
      ) - 1 as row_index
      FROM formulation_items
    )
    UPDATE formulation_items fi
    SET position = ii.row_index
    FROM indexed_items ii
    WHERE fi.id = ii.id;
    
    -- Set default value for new records
    ALTER TABLE formulation_items ALTER COLUMN position SET DEFAULT 0;
    
    -- Add index for better performance
    CREATE INDEX IF NOT EXISTS formulation_items_position_idx ON formulation_items (formulation_id, item_type, position);
  END IF;
END $$;