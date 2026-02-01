-- Add optional visit_time to visits (e.g. 09:30 for appointment time)

BEGIN;

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS visit_time TIME;

COMMIT;
