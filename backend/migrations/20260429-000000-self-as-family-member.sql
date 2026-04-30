-- Self-as-family-member: collapse the standalone "personal record" subsystem
-- (introduced 20260428) into the regular family/children model.
--
-- Rationale: rather than maintaining two parallel storage paths
-- (children-of-family vs. polymorphic user-owned visits/illnesses/symptoms),
-- the account holder is represented as a row in the `children` table linked
-- back to their user via children.user_id. Their data flows through the
-- existing family-access authorization path.
--
-- Migration steps:
--   1. Add children.user_id (UNIQUE, nullable) so a single child row can
--      represent a user.
--   2. For each user with personal_record_enabled=true, ensure a default
--      family exists, then create a self-child row in that family.
--   3. Backfill visits.child_id and illnesses.child_id from the polymorphic
--      user_id columns using the new self-child mapping.
--   4. Drop the XOR constraints, drop visits.user_id, drop illnesses.user_id,
--      drop visits.is_private and illnesses.is_private (no current readers
--      or writers; will be reintroduced when a real privacy feature ships),
--      and re-assert NOT NULL on visits.child_id / illnesses.child_id.
--   5. Drop the symptoms table introduced in 20260428. There is no router
--      using it; it will be reintroduced (on child_id) when the feature is
--      actually built.
--   6. Drop personal_record_shares and users.personal_record_enabled.

BEGIN;

-- 1. Add children.user_id ----------------------------------------------------
--
-- ON DELETE CASCADE is intentional. When a user account is deleted, the
-- self-row (children.user_id = users.id) and all of that user's medical
-- history (visits, illnesses, measurements, attachments — cascading through
-- children.id) are purged. This matches the GDPR-style "right to erasure"
-- expectation for an adult's own data.
--
-- A child row (user_id IS NULL) is unaffected by user deletion because it
-- belongs to the family, not the deleting user. Family-owned data persists
-- so co-parents do not lose their kids' records when one account is removed.

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- A user can be represented by at most one child row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'children_user_id_unique'
  ) THEN
    ALTER TABLE children
      ADD CONSTRAINT children_user_id_unique UNIQUE (user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_children_user_id
  ON children (user_id) WHERE user_id IS NOT NULL;

-- 2. Backfill self-child rows for users who had personal_record_enabled=true.
--
-- Family selection mirrors getOrCreateDefaultFamilyForUser():
--   - prefer a family the user is an 'owner' of,
--   - else any family they're a member of,
--   - else create a new family named "<username>'s Family" and add them as
--     owner.
--
-- This block is a no-op when the personal_record_enabled column does not
-- exist (i.e. fresh installs that never ran 20260428).

DO $$
DECLARE
  u RECORD;
  fam_id INTEGER;
  new_child_id INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'personal_record_enabled'
  ) THEN
    RAISE NOTICE 'personal_record_enabled column not present; skipping self-child backfill';
    RETURN;
  END IF;

  FOR u IN
    EXECUTE 'SELECT id, username FROM users WHERE personal_record_enabled = TRUE'
  LOOP
    -- Skip if this user already has a self-child row (idempotent re-runs).
    IF EXISTS (SELECT 1 FROM children WHERE user_id = u.id) THEN
      CONTINUE;
    END IF;

    -- Pick a family: owner > any member > create new.
    SELECT family_id INTO fam_id
      FROM family_members
     WHERE user_id = u.id AND role = 'owner'
     ORDER BY family_id
     LIMIT 1;

    IF fam_id IS NULL THEN
      SELECT family_id INTO fam_id
        FROM family_members
       WHERE user_id = u.id
       ORDER BY family_id
       LIMIT 1;
    END IF;

    IF fam_id IS NULL THEN
      INSERT INTO families (name)
        VALUES (u.username || '''s Family')
        RETURNING id INTO fam_id;
      INSERT INTO family_members (family_id, user_id, role)
        VALUES (fam_id, u.id, 'owner');
    END IF;

    INSERT INTO children (family_id, user_id, name, date_of_birth, gender)
      VALUES (fam_id, u.id, u.username, DATE '2000-01-01', 'female')
      RETURNING id INTO new_child_id;
  END LOOP;
END$$;

-- 3. Repoint visits.user_id -> visits.child_id ------------------------------

-- Drop xor constraint first so we can populate child_id while user_id is
-- still non-null on adult-personal rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_owner_xor'
  ) THEN
    ALTER TABLE visits DROP CONSTRAINT visits_owner_xor;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visits' AND column_name = 'user_id'
  ) THEN
    -- Map each polymorphic-owned visit to its owner's self-child row.
    UPDATE visits v
       SET child_id = c.id
      FROM children c
     WHERE v.user_id IS NOT NULL
       AND v.child_id IS NULL
       AND c.user_id = v.user_id;

    -- If any rows still have NULL child_id, there is no self-child row
    -- to point them at (e.g. their owner had personal_record_enabled=false
    -- but somehow had visits anyway). Fail loudly rather than silently
    -- delete user data.
    IF EXISTS (SELECT 1 FROM visits WHERE child_id IS NULL) THEN
      RAISE EXCEPTION 'visits backfill incomplete: % rows still have NULL child_id',
        (SELECT COUNT(*) FROM visits WHERE child_id IS NULL);
    END IF;
  END IF;
END$$;

DROP INDEX IF EXISTS idx_visits_user;

ALTER TABLE visits DROP COLUMN IF EXISTS user_id;
ALTER TABLE visits DROP COLUMN IF EXISTS is_private;
ALTER TABLE visits ALTER COLUMN child_id SET NOT NULL;

-- 4. Repoint illnesses.user_id -> illnesses.child_id ------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'illnesses_owner_xor'
  ) THEN
    ALTER TABLE illnesses DROP CONSTRAINT illnesses_owner_xor;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'illnesses' AND column_name = 'user_id'
  ) THEN
    UPDATE illnesses i
       SET child_id = c.id
      FROM children c
     WHERE i.user_id IS NOT NULL
       AND i.child_id IS NULL
       AND c.user_id = i.user_id;

    IF EXISTS (SELECT 1 FROM illnesses WHERE child_id IS NULL) THEN
      RAISE EXCEPTION 'illnesses backfill incomplete: % rows still have NULL child_id',
        (SELECT COUNT(*) FROM illnesses WHERE child_id IS NULL);
    END IF;
  END IF;
END$$;

DROP INDEX IF EXISTS idx_illnesses_user;

ALTER TABLE illnesses DROP COLUMN IF EXISTS user_id;
ALTER TABLE illnesses DROP COLUMN IF EXISTS is_private;
ALTER TABLE illnesses ALTER COLUMN child_id SET NOT NULL;

-- 5. Symptoms: drop the table introduced in 20260428 -----------------------
--
-- There is no router or feature module using this table; it was created
-- only for the personal-record subsystem. It will be reintroduced (on
-- child_id, with appropriate access checks) when a real symptoms feature
-- is built.

DROP TABLE IF EXISTS symptoms CASCADE;

-- 6. Tear down the personal-record subsystem --------------------------------

DROP TABLE IF EXISTS personal_record_shares;

ALTER TABLE users DROP COLUMN IF EXISTS personal_record_enabled;

COMMIT;
