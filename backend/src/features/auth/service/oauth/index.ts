/**
 * OAuth provider registry.
 *
 * Loads providers from the database first; falls back to env-var configuration
 * if no DB providers exist or if the DB hasn't been initialized.
 */

import { BaseProvider, type OAuthProviderConfig } from './BaseProvider.js';
import { AuthentikProvider } from './AuthentikProvider.js';
import { GenericOIDCProvider } from './GenericOIDCProvider.js';
import { getEnabledOAuthProviders, type OAuthProviderRow } from '../../../../db/oauth.js';

const providers = new Map<BaseProvider['name'], BaseProvider>();
const providerSettings = new Map<string, { autoRegister: boolean }>();

type ProviderType = 'authentik' | 'generic_oidc';

function resolveProviderClass(providerType: string): (new (cfg: OAuthProviderConfig) => BaseProvider) | null {
  switch (providerType.toLowerCase() as ProviderType) {
    case 'authentik':
      return AuthentikProvider;
    case 'generic_oidc':
      return GenericOIDCProvider;
    default:
      return null;
  }
}

function registerProvider(provider: BaseProvider, settings: { autoRegister: boolean }): void {
  providers.set(provider.name, provider);
  providerSettings.set(provider.name, settings);
}

export function getProvider(name: string): BaseProvider | null {
  return providers.get(name) ?? null;
}

export function getConfiguredProviders(): { name: string; displayName: string }[] {
  return Array.from(providers.values()).map((p) => ({
    name: p.name,
    displayName: p.displayName,
  }));
}

export function isOAuthEnabled(): boolean {
  return providers.size > 0;
}

export function getProviderSettings(name: string): { autoRegister: boolean } {
  return (
    providerSettings.get(name) ?? {
      autoRegister: parseBool(process.env.OAUTH_AUTO_REGISTER, true),
    }
  );
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(raw.trim().toLowerCase());
}

function initializeFromDB(rows: OAuthProviderRow[]): void {
  for (const row of rows) {
    if (!row.client_id || !row.client_secret || !row.issuer_url) {
      console.warn(`OAuth provider '${row.name}' is missing required fields, skipping`);
      continue;
    }
    try {
      new URL(row.issuer_url);
    } catch {
      console.warn(`OAuth provider '${row.name}' has invalid issuer URL, skipping`);
      continue;
    }

    const ProviderClass = resolveProviderClass(row.provider_type);
    if (!ProviderClass) {
      console.warn(`Unknown OAuth provider type '${row.provider_type}' for '${row.name}', skipping`);
      continue;
    }

    const scopes = (row.scopes || 'openid,profile,email')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const provider = new ProviderClass({
      name: row.name,
      displayName: row.display_name,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      issuerUrl: row.issuer_url,
      scopes,
    });

    registerProvider(provider, { autoRegister: row.auto_register });
    console.log(`Registered OAuth provider: ${provider.name} (${provider.displayName})`);
  }
}

function initializeFromEnv(): void {
  const providerType = (process.env.OAUTH_PROVIDER || '').trim().toLowerCase();
  if (!providerType) return;

  const clientId = process.env.OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || '';
  const issuerUrl = process.env.OAUTH_ISSUER_URL || '';
  if (!clientId || !clientSecret || !issuerUrl) {
    console.warn('OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_ISSUER_URL must all be set to enable env-var OAuth');
    return;
  }

  try {
    new URL(issuerUrl);
  } catch {
    console.warn('OAUTH_ISSUER_URL is not a valid URL, skipping env-var provider');
    return;
  }

  if (providers.has(providerType)) {
    return;
  }

  const ProviderClass = resolveProviderClass(providerType);
  if (!ProviderClass) {
    console.warn(`OAUTH_PROVIDER '${providerType}' is unsupported. Use: authentik, generic_oidc`);
    return;
  }

  const scopes = (process.env.OAUTH_SCOPES || 'openid,profile,email')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const provider = new ProviderClass({
    name: providerType,
    clientId,
    clientSecret,
    issuerUrl,
    scopes,
  });

  registerProvider(provider, { autoRegister: parseBool(process.env.OAUTH_AUTO_REGISTER, true) });
  console.log(`Registered OAuth provider from env: ${provider.name} (${provider.displayName})`);
}

export async function initializeOAuthProviders(): Promise<void> {
  try {
    const rows = await getEnabledOAuthProviders();
    if (rows.length > 0) {
      initializeFromDB(rows);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Could not load OAuth providers from DB, falling back to env: ${msg}`);
  }

  initializeFromEnv();

  if (providers.size === 0) {
    console.log('No OAuth providers configured');
  }
}

export async function reloadOAuthProviders(): Promise<void> {
  providers.clear();
  providerSettings.clear();
  await initializeOAuthProviders();
}

export function isLocalLoginAllowed(): boolean {
  return parseBool(process.env.OAUTH_ALLOW_LOCAL_LOGIN, true);
}
