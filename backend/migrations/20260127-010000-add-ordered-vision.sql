-- Add ordered_glasses and ordered_contacts boolean columns to visits
ALTER TABLE visits
  ADD COLUMN ordered_glasses BOOLEAN,
  ADD COLUMN ordered_contacts BOOLEAN;

-- Backfill from legacy needs_glasses if present
UPDATE visits
SET ordered_glasses = needs_glasses
WHERE ordered_glasses IS NULL AND needs_glasses IS NOT NULL;

-- Note: we keep `needs_glasses` column for compatibility; new code writes/reads `ordered_glasses` and `ordered_contacts`.
