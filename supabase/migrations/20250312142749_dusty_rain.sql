/*
  # Update Graphics Production Status

  1. Changes
    - Add new status values for graphics productions
    - Update status check constraint
    - Add default values for new status fields

  2. Notes
    - Status can be: 'PENDING', 'COMPLETED'
    - Billing status can be: 'NOT_BILLED', 'BILLED'
*/

-- Update status check constraint
ALTER TABLE graphics_productions
DROP CONSTRAINT IF EXISTS graphics_productions_status_check,
ADD CONSTRAINT graphics_productions_status_check 
  CHECK (status IN ('PENDING', 'COMPLETED'));

-- Update billing status check constraint
ALTER TABLE graphics_productions
DROP CONSTRAINT IF EXISTS graphics_productions_billing_status_check,
ADD CONSTRAINT graphics_productions_billing_status_check
  CHECK (billing_status IN ('NOT_BILLED', 'BILLED'));

-- Set default values
ALTER TABLE graphics_productions
ALTER COLUMN status SET DEFAULT 'PENDING',
ALTER COLUMN billing_status SET DEFAULT 'NOT_BILLED';