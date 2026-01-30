-- Family-based access foundation
-- Children belong to a family; only family members can see a child's data.
-- For now: one family per user (created on register); later: invite users to a family.
-- Run after schema.sql (applies to existing DBs; safe to run once).

-- Families (one per user for now; later multiple users can be members)
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which users belong to which families (future: invite = add row here)
CREATE TABLE IF NOT EXISTS family_members (
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- Children belong to a family (all child-scoped data is accessible only to family members)
ALTER TABLE children ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE RESTRICT;

-- Backfill: give every existing user a family and assign existing children to the first user's family
DO $$
DECLARE
    first_user_id INTEGER;
    first_family_id INTEGER;
    u RECORD;
    fid INTEGER;
    has_null_children BOOLEAN;
BEGIN
    -- Create one family per user and add them as owner (idempotent: ON CONFLICT on family_members)
    FOR u IN SELECT id FROM users ORDER BY id
    LOOP
        INSERT INTO families (name) VALUES ('My Family') RETURNING id INTO fid;
        INSERT INTO family_members (family_id, user_id, role)
        VALUES (fid, u.id, 'owner')
        ON CONFLICT (family_id, user_id) DO NOTHING;
    END LOOP;

    -- Assign existing children that have no family to the first user's family (no creator history)
    SELECT id FROM users ORDER BY id LIMIT 1 INTO first_user_id;
    IF first_user_id IS NOT NULL THEN
        SELECT fm.family_id INTO first_family_id FROM family_members fm WHERE fm.user_id = first_user_id LIMIT 1;
        IF first_family_id IS NOT NULL THEN
            UPDATE children SET family_id = first_family_id WHERE family_id IS NULL;
        END IF;
    END IF;

    -- If any children still have no family (e.g. no users), assign to a single "Legacy" family so NOT NULL is valid
    SELECT EXISTS (SELECT 1 FROM children WHERE family_id IS NULL LIMIT 1) INTO has_null_children;
    IF has_null_children THEN
        INSERT INTO families (name) VALUES ('Legacy') RETURNING id INTO fid;
        UPDATE children SET family_id = fid WHERE family_id IS NULL;
    END IF;
END $$;

-- Enforce family_id required for new rows
ALTER TABLE children ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);
