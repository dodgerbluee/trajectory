-- Personal records (adult accounts): Phase 1
-- Adds opt-in personal-record support so a user can track their own visits,
-- illnesses, and symptoms separate from any children-of-family data.
--
-- Design notes:
--   * Polymorphic owner on visits/illnesses: exactly one of (child_id, user_id)
--     is set per row. Existing rows keep child_id; adult-personal rows set
--     user_id and leave child_id null.
--   * is_private overrides any account-level share — owner-only, queries return
--     404-style absence to viewers (handled in app layer).
--   * Symptoms is adult-only for now (user_id NOT NULL, no child_id).
--   * personal_record_shares is bilateral (owner → viewer), view-only. App
--     layer enforces that viewer must share at least one family with owner.

-- 1. Per-user opt-in flag (default off).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS personal_record_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. visits: polymorphic owner + per-row privacy override.
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- Make child_id nullable; existing rows are unaffected.
ALTER TABLE visits ALTER COLUMN child_id DROP NOT NULL;

-- Exactly one of (child_id, user_id) must be set.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_owner_xor'
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_owner_xor
      CHECK ((child_id IS NULL) <> (user_id IS NULL));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_visits_user
  ON visits (user_id, visit_date DESC)
  WHERE user_id IS NOT NULL;

-- 3. illnesses: same polymorphic + privacy treatment.
ALTER TABLE illnesses
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE illnesses ALTER COLUMN child_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'illnesses_owner_xor'
  ) THEN
    ALTER TABLE illnesses
      ADD CONSTRAINT illnesses_owner_xor
      CHECK ((child_id IS NULL) <> (user_id IS NULL));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_illnesses_user
  ON illnesses (user_id, start_date DESC)
  WHERE user_id IS NOT NULL;

-- 4. Symptoms: adult-only (user_id NOT NULL).
CREATE TABLE IF NOT EXISTS symptoms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  body_area VARCHAR(60),
  severity INTEGER CHECK (severity IS NULL OR (severity >= 1 AND severity <= 10)),
  occurred_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min >= 0),
  notes TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_occurred ON symptoms (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_name ON symptoms (user_id, name);

DROP TRIGGER IF EXISTS update_symptoms_updated_at ON symptoms;
CREATE TRIGGER update_symptoms_updated_at
  BEFORE UPDATE ON symptoms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Personal-record shares (view-only, bilateral pairs).
CREATE TABLE IF NOT EXISTS personal_record_shares (
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_user_id, viewer_user_id),
  CONSTRAINT personal_record_shares_distinct CHECK (owner_user_id <> viewer_user_id)
);
CREATE INDEX IF NOT EXISTS idx_personal_record_shares_viewer
  ON personal_record_shares (viewer_user_id);
