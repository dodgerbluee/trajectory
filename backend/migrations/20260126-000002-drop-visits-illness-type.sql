-- Drop legacy visits.illness_type column and related constraint/index
BEGIN;

-- Remove check constraint that referenced illness_type (if present)
ALTER TABLE IF EXISTS visits DROP CONSTRAINT IF EXISTS check_illness_type_for_sick;

-- Drop index on visits.illness_type if it exists
DROP INDEX IF EXISTS idx_visits_illness;

-- Drop the column from visits
ALTER TABLE IF EXISTS visits DROP COLUMN IF EXISTS illness_type;

COMMIT;
