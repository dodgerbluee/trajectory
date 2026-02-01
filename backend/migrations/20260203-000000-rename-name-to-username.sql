-- Rename users.name to users.username (drop index on old column first, then recreate)
DROP INDEX IF EXISTS idx_users_name_lower_unique;
ALTER TABLE users RENAME COLUMN name TO username;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique ON users (LOWER(username));
