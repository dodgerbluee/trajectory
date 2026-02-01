-- One illness record can have multiple illness types (like visit_illnesses).
-- Join table illness_illness_types; migrate existing single type, then drop column.
-- This migration is idempotent - safe to run if schema already has new structure.

CREATE TABLE IF NOT EXISTS illness_illness_types (
    illness_id INTEGER NOT NULL REFERENCES illnesses(id) ON DELETE CASCADE,
    illness_type VARCHAR(100) NOT NULL CHECK (illness_type IN (
        'flu', 'strep', 'rsv', 'covid', 'cold', 'stomach_bug',
        'ear_infection', 'hand_foot_mouth', 'croup', 'pink_eye', 'other'
    )),
    PRIMARY KEY (illness_id, illness_type)
);

-- Only migrate data if illness_type column exists on illnesses table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'illnesses' AND column_name = 'illness_type'
  ) THEN
    -- Migrate existing data from illness_type column
    INSERT INTO illness_illness_types (illness_id, illness_type)
    SELECT id, illness_type FROM illnesses
    WHERE illness_type IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Drop the old column
    ALTER TABLE illnesses DROP COLUMN IF EXISTS illness_type;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_illness_illness_types_illness ON illness_illness_types(illness_id);
CREATE INDEX IF NOT EXISTS idx_illness_illness_types_type ON illness_illness_types(illness_type);
