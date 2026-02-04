-- Make email optional on users table
-- Allows users to register without providing an email address

-- Drop the NOT NULL constraint on email
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Drop the unique constraint so multiple users can have NULL email
ALTER TABLE users DROP CONSTRAINT users_email_key;

-- Recreate the unique constraint to allow multiple NULLs but keep uniqueness for non-null emails
CREATE UNIQUE INDEX idx_users_email_unique_nullable ON users (email) WHERE email IS NOT NULL;
