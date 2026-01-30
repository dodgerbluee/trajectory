-- Remove next_appointment_date column from visits table
-- This field is no longer used in the dental visit form

BEGIN;

-- Drop the constraint first
ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS check_next_appointment_date;

-- Drop the column
ALTER TABLE visits
  DROP COLUMN IF EXISTS next_appointment_date;

COMMIT;
