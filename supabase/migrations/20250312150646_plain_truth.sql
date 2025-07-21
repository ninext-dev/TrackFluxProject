/*
  # Add invoice number and billing completion date fields

  1. Changes
    - Add invoice_number column to graphics_productions table
    - Add billing_completed_at column to graphics_productions table
    - Update billing status logic to be based on invoice number
*/

-- Add new columns
ALTER TABLE graphics_productions
ADD COLUMN invoice_number text,
ADD COLUMN billing_completed_at timestamptz;

-- Update existing records
UPDATE graphics_productions
SET billing_completed_at = updated_at
WHERE billing_status = 'BILLED';