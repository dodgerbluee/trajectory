-- OAuth / OIDC SSO support
-- Adds OAuth identity columns to users and creates the oauth_states and oauth_providers tables.

ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id VARCHAR(255);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_provider_id_unique
  ON users (oauth_provider, oauth_provider_id)
  WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;

-- Single-use state records issued during OAuth login initiation
CREATE TABLE IF NOT EXISTS oauth_states (
  id SERIAL PRIMARY KEY,
  state VARCHAR(255) NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  nonce VARCHAR(255) NOT NULL,
  redirect_uri TEXT,
  provider_name VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_created_at ON oauth_states(created_at);

-- Admin-configurable OAuth/OIDC providers
CREATE TABLE IF NOT EXISTS oauth_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'openid,profile,email',
  auto_register BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_enabled ON oauth_providers(enabled);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_oauth_providers_updated_at') THEN
        CREATE TRIGGER update_oauth_providers_updated_at BEFORE UPDATE ON oauth_providers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
