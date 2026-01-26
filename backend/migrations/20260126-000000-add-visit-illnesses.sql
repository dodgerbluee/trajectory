-- Add normalized join table for visit illnesses
-- Creates visit_illnesses and backfills existing visits.illness_type

BEGIN;

CREATE TABLE IF NOT EXISTS visit_illnesses (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  illness_type VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_illnesses_visit ON visit_illnesses(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_illnesses_type ON visit_illnesses(illness_type);

-- Backfill: copy any existing visits.illness_type into the new table
INSERT INTO visit_illnesses (visit_id, illness_type)
SELECT id AS visit_id, illness_type
FROM visits
WHERE illness_type IS NOT NULL;

COMMIT;
