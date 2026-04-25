/**
 * OAuth-related database queries: state records, OAuth user lookup/creation,
 * and provider configuration CRUD.
 */

import { query, transaction } from './connection.js';

export interface OAuthStateRow {
  state: string;
  code_verifier: string;
  nonce: string;
  redirect_uri: string | null;
  provider_name: string | null;
  created_at: Date;
}

export interface StoredOAuthState {
  codeVerifier: string;
  nonce: string;
  redirectUri: string | null;
  providerName: string | null;
}

const OAUTH_STATE_TTL_MINUTES = 10;

export async function createOAuthState(
  state: string,
  codeVerifier: string,
  nonce: string,
  redirectUri: string,
  providerName: string
): Promise<void> {
  await query(
    `INSERT INTO oauth_states (state, code_verifier, nonce, redirect_uri, provider_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [state, codeVerifier, nonce, redirectUri, providerName]
  );
}

/**
 * Atomically delete and return the state row. Single-use: a second call with
 * the same state returns null. Expired rows are treated as missing.
 */
export async function consumeOAuthState(state: string): Promise<StoredOAuthState | null> {
  const result = await query<OAuthStateRow>(
    `DELETE FROM oauth_states
     WHERE state = $1 AND created_at > NOW() - INTERVAL '${OAUTH_STATE_TTL_MINUTES} minutes'
     RETURNING state, code_verifier, nonce, redirect_uri, provider_name, created_at`,
    [state]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    codeVerifier: row.code_verifier,
    nonce: row.nonce,
    redirectUri: row.redirect_uri,
    providerName: row.provider_name,
  };
}

export async function cleanExpiredOAuthStates(): Promise<void> {
  await query(
    `DELETE FROM oauth_states WHERE created_at <= NOW() - INTERVAL '${OAUTH_STATE_TTL_MINUTES} minutes'`
  );
}

export interface OAuthUserRow {
  id: number;
  email: string | null;
  username: string;
  password_hash: string | null;
  is_instance_admin: boolean;
  oauth_provider: string | null;
  oauth_provider_id: string | null;
  onboarding_completed: boolean;
}

export async function getUserByOAuthId(
  provider: string,
  providerId: string
): Promise<OAuthUserRow | null> {
  const result = await query<OAuthUserRow>(
    `SELECT id, email, username, password_hash, is_instance_admin,
            oauth_provider, oauth_provider_id, onboarding_completed
     FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2`,
    [provider, providerId]
  );
  return result.rows[0] ?? null;
}

export async function getUserByEmailForOAuth(email: string): Promise<OAuthUserRow | null> {
  const result = await query<OAuthUserRow>(
    `SELECT id, email, username, password_hash, is_instance_admin,
            oauth_provider, oauth_provider_id, onboarding_completed
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function getUserByUsernameForOAuth(username: string): Promise<OAuthUserRow | null> {
  const result = await query<OAuthUserRow>(
    `SELECT id, email, username, password_hash, is_instance_admin,
            oauth_provider, oauth_provider_id, onboarding_completed
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function linkOAuthToUser(
  userId: number,
  provider: string,
  providerId: string
): Promise<void> {
  await query(
    'UPDATE users SET oauth_provider = $1, oauth_provider_id = $2 WHERE id = $3',
    [provider, providerId, userId]
  );
}

export async function createOAuthUser(params: {
  username: string;
  email: string | null;
  oauthProvider: string;
  oauthProviderId: string;
  isInstanceAdmin: boolean;
}): Promise<OAuthUserRow> {
  const { username, email, oauthProvider, oauthProviderId, isInstanceAdmin } = params;
  const result = await query<OAuthUserRow>(
    `INSERT INTO users (username, email, oauth_provider, oauth_provider_id, is_instance_admin, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, username, password_hash, is_instance_admin,
               oauth_provider, oauth_provider_id, onboarding_completed`,
    [username, email ? email.toLowerCase() : null, oauthProvider, oauthProviderId, isInstanceAdmin, !!email]
  );
  return result.rows[0];
}

export async function hasAnyUsers(): Promise<boolean> {
  const result = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM users');
  return parseInt(result.rows[0]?.count ?? '0', 10) > 0;
}

export async function updateLastLogin(userId: number): Promise<void> {
  await query(
    'UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [userId]
  );
}

export interface OAuthProviderRow {
  id: number;
  name: string;
  display_name: string;
  provider_type: string;
  client_id: string;
  client_secret: string;
  issuer_url: string;
  scopes: string;
  auto_register: boolean;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getEnabledOAuthProviders(): Promise<OAuthProviderRow[]> {
  const result = await query<OAuthProviderRow>(
    'SELECT * FROM oauth_providers WHERE enabled = TRUE ORDER BY id'
  );
  return result.rows;
}

export async function getAllOAuthProviders(): Promise<OAuthProviderRow[]> {
  const result = await query<OAuthProviderRow>('SELECT * FROM oauth_providers ORDER BY id');
  return result.rows;
}

export async function getOAuthProviderById(id: number): Promise<OAuthProviderRow | null> {
  const result = await query<OAuthProviderRow>('SELECT * FROM oauth_providers WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createOAuthProviderRow(input: {
  name: string;
  displayName: string;
  providerType: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  scopes: string;
  autoRegister: boolean;
  enabled: boolean;
}): Promise<OAuthProviderRow> {
  const result = await query<OAuthProviderRow>(
    `INSERT INTO oauth_providers
       (name, display_name, provider_type, client_id, client_secret, issuer_url, scopes, auto_register, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.name,
      input.displayName,
      input.providerType,
      input.clientId,
      input.clientSecret,
      input.issuerUrl,
      input.scopes,
      input.autoRegister,
      input.enabled,
    ]
  );
  return result.rows[0];
}

export async function updateOAuthProviderRow(
  id: number,
  input: {
    displayName?: string;
    providerType?: string;
    clientId?: string;
    clientSecret?: string;
    issuerUrl?: string;
    scopes?: string;
    autoRegister?: boolean;
    enabled?: boolean;
  }
): Promise<OAuthProviderRow | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  const map: Record<string, string> = {
    displayName: 'display_name',
    providerType: 'provider_type',
    clientId: 'client_id',
    clientSecret: 'client_secret',
    issuerUrl: 'issuer_url',
    scopes: 'scopes',
    autoRegister: 'auto_register',
    enabled: 'enabled',
  };
  for (const [key, column] of Object.entries(map)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) {
      // Skip secret if it's empty (allows updates that don't rotate the secret)
      if (key === 'clientSecret' && value === '') continue;
      fields.push(`${column} = $${fields.length + 1}`);
      values.push(value);
    }
  }
  if (fields.length === 0) {
    return getOAuthProviderById(id);
  }
  values.push(id);
  const result = await query<OAuthProviderRow>(
    `UPDATE oauth_providers SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteOAuthProviderRow(id: number): Promise<boolean> {
  const result = await query('DELETE FROM oauth_providers WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export { transaction };
