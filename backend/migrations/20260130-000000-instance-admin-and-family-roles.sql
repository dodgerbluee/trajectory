-- Instance admin and family roles (owner / parent / read_only)
-- Run after family-access migration. Idempotent where possible.

-- 1. Instance admin: add column to users (first user will be set admin in app layer)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_instance_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Family roles: expand from owner/member to owner/parent/read_only
-- Backfill: existing 'member' becomes 'parent' (they had full access)
UPDATE family_members SET role = 'parent' WHERE role = 'member';

-- Drop existing role check constraint (find by name; PostgreSQL auto-names it tablename_columnname_check)
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_role_check;

-- Add new check allowing owner, parent, read_only
ALTER TABLE family_members ADD CONSTRAINT family_members_role_check
  CHECK (role IN ('owner', 'parent', 'read_only'));

-- Ensure default for new rows is sensible (parent when added via invite)
ALTER TABLE family_members ALTER COLUMN role SET DEFAULT 'parent';
