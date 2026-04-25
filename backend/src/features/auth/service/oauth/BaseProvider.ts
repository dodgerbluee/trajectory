/**
 * Abstract OAuth2/OpenID Connect provider.
 *
 * Implements the generic OIDC flow: discovery, PKCE/state/nonce generation,
 * authorization URL construction, code exchange, ID token validation, and
 * userinfo fetching. Concrete providers override normalizeUserInfo().
 */

import crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface OAuthProviderConfig {
  name: string;
  displayName?: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  scopes?: string[];
}

export interface NormalizedOAuthUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  groups: string[];
}

interface DiscoveryDoc {
  authorization_endpoint: string;
  token_endpoint: string;
  issuer: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
}

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

const DISCOVERY_CACHE_MS = 60 * 60 * 1000;

export abstract class BaseProvider {
  readonly name: string;
  readonly displayName: string;
  readonly clientId: string;
  protected readonly clientSecret: string;
  readonly issuerUrl: string;
  readonly scopes: string[];

  private discoveryDoc: DiscoveryDoc | null = null;
  private discoveryFetchedAt = 0;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(config: OAuthProviderConfig) {
    this.name = config.name;
    this.displayName = config.displayName || config.name;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.issuerUrl = config.issuerUrl;
    this.scopes = config.scopes && config.scopes.length > 0
      ? config.scopes
      : ['openid', 'profile', 'email'];
  }

  static generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async discover(): Promise<DiscoveryDoc> {
    if (this.discoveryDoc && Date.now() - this.discoveryFetchedAt < DISCOVERY_CACHE_MS) {
      return this.discoveryDoc;
    }

    const url = this.buildDiscoveryUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Discovery request returned ${response.status}`);
      }
      const doc = (await response.json()) as DiscoveryDoc;
      const required: (keyof DiscoveryDoc)[] = ['authorization_endpoint', 'token_endpoint', 'issuer'];
      for (const field of required) {
        if (!doc[field]) {
          throw new Error(`Discovery document missing required field: ${field}`);
        }
      }
      this.discoveryDoc = doc;
      this.discoveryFetchedAt = Date.now();
      if (doc.jwks_uri) {
        this.jwks = createRemoteJWKSet(new URL(doc.jwks_uri));
      }
      return doc;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`SSO provider unavailable: ${msg}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildDiscoveryUrl(): string {
    const trimmed = this.issuerUrl.replace(/\/+$/, '');
    if (trimmed.endsWith('/.well-known/openid-configuration')) {
      return trimmed;
    }
    return `${trimmed}/.well-known/openid-configuration`;
  }

  async getAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    nonce: string;
    redirectUri: string;
  }): Promise<string> {
    const discovery = await this.discover();
    const search = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: params.redirectUri,
      scope: this.scopes.join(' '),
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${discovery.authorization_endpoint}?${search.toString()}`;
  }

  async exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<TokenResponse> {
    const discovery = await this.discover();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code_verifier: params.codeVerifier,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const detail =
          (typeof data.error_description === 'string' && data.error_description) ||
          (typeof data.error === 'string' && data.error) ||
          `HTTP ${response.status}`;
        throw new Error(`Token exchange failed: ${detail}`);
      }
      return data as TokenResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  async validateIdToken(idToken: string, expectedNonce: string): Promise<JWTPayload> {
    const discovery = await this.discover();
    if (!this.jwks) {
      throw new Error('JWKS not available - discovery may have failed');
    }

    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: discovery.issuer,
        audience: this.clientId,
      });
      if (payload.nonce !== expectedNonce) {
        throw new Error('ID token nonce mismatch');
      }
      return payload;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`ID token validation failed: ${msg}`);
    }
  }

  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const discovery = await this.discover();
    if (!discovery.userinfo_endpoint) {
      return {};
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        return {};
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return {};
    } finally {
      clearTimeout(timeout);
    }
  }

  abstract normalizeUserInfo(
    userInfo: Record<string, unknown>,
    idTokenClaims: JWTPayload
  ): NormalizedOAuthUser;
}

export function sanitizeUsername(raw: string): string {
  let sanitized = raw.replace(/[^a-zA-Z0-9_.-]/g, '_');
  sanitized = sanitized.replace(/_+/g, '_');
  sanitized = sanitized.replace(/^_+|_+$/g, '');
  if (sanitized.length < 3) {
    sanitized = sanitized.padEnd(3, '_');
  }
  return sanitized;
}
