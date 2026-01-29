-- Remove follow_up_date from visits (no longer used in Injury section)
ALTER TABLE visits DROP COLUMN IF EXISTS follow_up_date;
