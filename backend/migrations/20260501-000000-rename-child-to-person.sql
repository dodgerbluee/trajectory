-- Migration: rename child → person across the schema.
--
-- Why: self-records are now regular family-member rows, not just children.
-- The `children` table has always represented both kids and adults; this
-- migration brings the storage layer in line with the domain.
--
-- Renames in this migration:
--   - Tables:        children          → people
--                    child_attachments → person_attachments
--   - Columns:       <table>.child_id  → <table>.person_id
--                    on measurements, medical_events, visits, illnesses,
--                    person_attachments (after table rename)
--   - Indexes:       idx_children_*, idx_*_child_date, idx_child_attachments_*
--                    → idx_people_*, idx_*_person_date, idx_person_attachments_*
--   - Trigger:       update_children_updated_at → update_people_updated_at
--   - Constraint:    children_user_id_unique     → people_user_id_unique
--
-- FK constraint names (system-generated like `measurements_child_id_fkey`)
-- are NOT renamed — Postgres tolerates the old names referencing the new
-- column, and the cost of touching them isn't worth the churn.
--
-- This migration is forward-only. Wrap in a transaction so a failure leaves
-- the schema consistent.

BEGIN;

-- 1. Rename tables
ALTER TABLE children RENAME TO people;
ALTER TABLE child_attachments RENAME TO person_attachments;

-- 2. Rename FK columns
ALTER TABLE measurements        RENAME COLUMN child_id TO person_id;
ALTER TABLE medical_events      RENAME COLUMN child_id TO person_id;
ALTER TABLE visits              RENAME COLUMN child_id TO person_id;
ALTER TABLE illnesses           RENAME COLUMN child_id TO person_id;
ALTER TABLE person_attachments  RENAME COLUMN child_id TO person_id;

-- 3. Rename indexes
ALTER INDEX idx_children_family            RENAME TO idx_people_family;
ALTER INDEX idx_children_user_id           RENAME TO idx_people_user_id;
ALTER INDEX idx_measurements_child_date    RENAME TO idx_measurements_person_date;
ALTER INDEX idx_medical_events_child_date  RENAME TO idx_medical_events_person_date;
ALTER INDEX idx_visits_child_date          RENAME TO idx_visits_person_date;
ALTER INDEX idx_illnesses_child_date       RENAME TO idx_illnesses_person_date;
ALTER INDEX idx_child_attachments_child    RENAME TO idx_person_attachments_person;

-- 4. Rename unique constraint on people.user_id
ALTER TABLE people RENAME CONSTRAINT children_user_id_unique TO people_user_id_unique;

-- 5. Rename trigger (drop+recreate; Postgres has no ALTER TRIGGER ... RENAME
-- in older supported versions, so this is the portable form)
DROP TRIGGER IF EXISTS update_children_updated_at ON people;
DROP TRIGGER IF EXISTS update_people_updated_at ON people;
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
