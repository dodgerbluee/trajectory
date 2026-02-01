-- Family invites: single-use, expiring links for sharing a family (parent or read_only role)
-- Token stored as hash; raw token shown once in create response.

CREATE TABLE IF NOT EXISTS family_invites (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'read_only')),
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invites_family ON family_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_token ON family_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_family_invites_expires ON family_invites(expires_at);
