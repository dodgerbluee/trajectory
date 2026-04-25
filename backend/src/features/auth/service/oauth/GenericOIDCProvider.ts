import type { JWTPayload } from 'jose';
import {
  BaseProvider,
  sanitizeUsername,
  type NormalizedOAuthUser,
  type OAuthProviderConfig,
} from './BaseProvider.js';

export class GenericOIDCProvider extends BaseProvider {
  constructor(config: OAuthProviderConfig) {
    super({
      ...config,
      name: config.name || 'generic_oidc',
      displayName: config.displayName || 'SSO',
    });
  }

  normalizeUserInfo(
    userInfo: Record<string, unknown>,
    idTokenClaims: JWTPayload
  ): NormalizedOAuthUser {
    const claims = { ...idTokenClaims, ...userInfo } as Record<string, unknown>;
    const id = claims.sub;
    if (typeof id !== 'string' || !id) {
      throw new Error("OIDC response missing 'sub' claim");
    }

    const email = typeof claims.email === 'string' ? claims.email : null;
    let username = typeof claims.preferred_username === 'string' ? claims.preferred_username : '';
    if (!username && email) {
      username = email.split('@')[0];
    }
    if (!username) {
      username = `oidc_${id.substring(0, 8)}`;
    }

    const groups = Array.isArray(claims.groups)
      ? claims.groups.filter((g): g is string => typeof g === 'string')
      : [];

    return {
      id,
      username: sanitizeUsername(username),
      email,
      displayName: typeof claims.name === 'string' ? claims.name : null,
      groups,
    };
  }
}
