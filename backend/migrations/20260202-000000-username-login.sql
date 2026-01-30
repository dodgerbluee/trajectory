-- Enforce unique usernames (name) for login: case-insensitive uniqueness.
-- If you have existing duplicate names, resolve them before running (e.g. rename in Settings).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_lower_unique ON users (LOWER(name));
