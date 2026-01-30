-- Add 'dental' to visit_type CHECK constraint and dental-specific columns
-- This migration is idempotent and safe to run multiple times
-- It will skip if the table doesn't exist (base schema will create it with dental columns)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'visits') THEN
    -- Update visit_type CHECK constraint (only if it doesn't already include 'dental')
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name = 'visits_visit_type_check' 
      AND check_clause LIKE '%dental%'
    ) THEN
      ALTER TABLE visits 
        DROP CONSTRAINT IF EXISTS visits_visit_type_check;

      ALTER TABLE visits 
        ADD CONSTRAINT visits_visit_type_check 
        CHECK (visit_type IN ('wellness', 'sick', 'injury', 'vision', 'dental'));
    END IF;

    -- Add dental-specific columns (IF NOT EXISTS makes this idempotent)
    ALTER TABLE visits 
      ADD COLUMN IF NOT EXISTS dental_procedure_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS dental_notes TEXT,
      ADD COLUMN IF NOT EXISTS cleaning_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS cavities_found INTEGER,
      ADD COLUMN IF NOT EXISTS cavities_filled INTEGER,
      ADD COLUMN IF NOT EXISTS xrays_taken BOOLEAN,
      ADD COLUMN IF NOT EXISTS fluoride_treatment BOOLEAN,
      ADD COLUMN IF NOT EXISTS sealants_applied BOOLEAN,
      ADD COLUMN IF NOT EXISTS next_appointment_date DATE,
      ADD COLUMN IF NOT EXISTS dental_procedures JSONB;

    -- Add constraints (drop and recreate to ensure they're correct)
    ALTER TABLE visits
      DROP CONSTRAINT IF EXISTS check_cavities_found,
      DROP CONSTRAINT IF EXISTS check_cavities_filled,
      DROP CONSTRAINT IF EXISTS check_cavities_filled_vs_found,
      DROP CONSTRAINT IF EXISTS check_next_appointment_date;

    ALTER TABLE visits
      ADD CONSTRAINT check_cavities_found CHECK (cavities_found IS NULL OR cavities_found >= 0),
      ADD CONSTRAINT check_cavities_filled CHECK (cavities_filled IS NULL OR cavities_filled >= 0),
      ADD CONSTRAINT check_cavities_filled_vs_found CHECK (
        cavities_filled IS NULL OR cavities_found IS NULL OR cavities_filled <= cavities_found
      ),
      ADD CONSTRAINT check_next_appointment_date CHECK (
        next_appointment_date IS NULL OR next_appointment_date >= visit_date
      );
  END IF;
END $$;
