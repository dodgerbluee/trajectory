-- Add illness_start_date to visits for sick visits (when illness started; used when creating illness record)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS illness_start_date DATE;

-- Illness start must be on or before visit date when set
ALTER TABLE visits ADD CONSTRAINT check_visits_illness_start_date
  CHECK (illness_start_date IS NULL OR illness_start_date <= visit_date);

-- End date (if set) must be >= illness start date (or visit date when no illness start)
ALTER TABLE visits DROP CONSTRAINT IF EXISTS check_visits_end_date;
ALTER TABLE visits ADD CONSTRAINT check_visits_end_date
  CHECK (end_date IS NULL OR end_date >= COALESCE(illness_start_date, visit_date));
