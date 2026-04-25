/**
 * OAuth/OIDC SSO routes.
 * Mounted at /api/auth/oauth.
 */

import express from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler, BadRequestError, UnauthorizedError } from '../middleware/error-handler.js';
import { createResponse } from '../types/api.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyPassword,
} from '../features/auth/service/auth.js';
import { query } from '../db/connection.js';
import {
  BaseProvider,
  type NormalizedOAuthUser,
} from '../features/auth/service/oauth/BaseProvider.js';
import {
  getProvider,
  getConfiguredProviders,
  getProviderSettings,
  isOAuthEnabled,
  isLocalLoginAllowed,
} from '../features/auth/service/oauth/index.js';
import {
  createOAuthState,
  consumeOAuthState,
  getUserByOAuthId,
  getUserByEmailForOAuth,
  getUserByUsernameForOAuth,
  linkOAuthToUser,
  createOAuthUser,
  hasAnyUsers,
  updateLastLogin,
  type OAuthUserRow,
} from '../db/oauth.js';

export const oauthRouter = express.Router();

const LINK_TOKEN_ISSUER = 'trajectory';
const LINK_TOKEN_AUDIENCE = 'trajectory-oauth-link';
const LINK_TOKEN_SECRET =
  process.env.JWT_SECRET || process.env.JWT_REFRESH_SECRET || 'change-me-in-production';

interface LinkTokenPayload {
  purpose: 'oauth_link';
  providerName: string;
  oauthId: string;
  oauthUsername: string;
  oauthEmail: string | null;
  targetUserId: number;
  targetUsername: string;
}

/**
 * GET /api/auth/oauth/providers
 * Public. Lists configured providers and whether password login is allowed.
 */
oauthRouter.get(
  '/providers',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(
      createResponse({
        providers: getConfiguredProviders(),
        allowLocalLogin: isLocalLoginAllowed(),
      })
    );
  })
);

/**
 * GET /api/auth/oauth/login?provider=<name>
 * Initiates OAuth: persists state/PKCE/nonce, redirects to provider.
 */
oauthRouter.get(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    if (!isOAuthEnabled()) {
      throw new BadRequestError('No OAuth providers are configured');
    }
    const providerName = typeof req.query.provider === 'string' ? req.query.provider : '';
    if (!providerName) {
      throw new BadRequestError('Provider parameter is required');
    }
    const provider = getProvider(providerName);
    if (!provider) {
      throw new BadRequestError(`OAuth provider '${providerName}' is not configured`);
    }

    const { codeVerifier, codeChallenge } = BaseProvider.generatePKCE();
    const state = BaseProvider.generateState();
    const nonce = BaseProvider.generateNonce();

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const callbackUrl = `${protocol}://${host}/api/auth/oauth/callback`;

    await createOAuthState(state, codeVerifier, nonce, callbackUrl, providerName);

    const authorizationUrl = await provider.getAuthorizationUrl({
      state,
      codeChallenge,
      nonce,
      redirectUri: callbackUrl,
    });

    res.redirect(authorizationUrl);
  })
);

/**
 * GET /api/auth/oauth/callback
 * Provider callback. Exchanges code, resolves user, issues session tokens via cookies,
 * then redirects to the frontend completion page.
 */
oauthRouter.get(
  '/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const frontendBase = `${protocol}://${host}`;
    const completeUrl = `${frontendBase}/auth/oauth/complete`;

    const redirectError = (msg: string): void => {
      res.redirect(`${completeUrl}?error=${encodeURIComponent(msg)}`);
    };

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
    const errorDescription =
      typeof req.query.error_description === 'string' ? req.query.error_description : '';

    if (oauthError) {
      let msg = errorDescription || oauthError;
      if (oauthError === 'access_denied') msg = 'Sign-in was cancelled.';
      else if (oauthError === 'unauthorized_client')
        msg = 'Sign-in service configuration error. Please contact your administrator.';
      else if (oauthError === 'server_error' || oauthError === 'temporarily_unavailable')
        msg = 'Sign-in service is temporarily unavailable. Please try again later.';
      console.warn(`OAuth callback error: ${oauthError} - ${msg}`);
      redirectError(msg);
      return;
    }

    if (!code || !state) {
      redirectError('Missing authorization code or state parameter');
      return;
    }

    const stored = await consumeOAuthState(state);
    if (!stored) {
      redirectError('Invalid or expired login session. Please try again.');
      return;
    }

    const providerName = stored.providerName ?? '';
    const provider = providerName ? getProvider(providerName) : null;
    if (!provider) {
      redirectError('OAuth provider not available');
      return;
    }

    try {
      const tokenResponse = await provider.exchangeCode({
        code,
        codeVerifier: stored.codeVerifier,
        redirectUri: stored.redirectUri ?? `${frontendBase}/api/auth/oauth/callback`,
      });

      if (!tokenResponse.access_token) {
        redirectError('Failed to obtain access token from provider');
        return;
      }

      let idTokenClaims = {};
      if (tokenResponse.id_token) {
        idTokenClaims = await provider.validateIdToken(tokenResponse.id_token, stored.nonce);
      }
      const rawUserInfo = await provider.getUserInfo(tokenResponse.access_token);
      const normalizedUser = provider.normalizeUserInfo(rawUserInfo, idTokenClaims);

      const result = await resolveOAuthUser(providerName, normalizedUser);

      if ('linkRequired' in result) {
        const linkPayload: LinkTokenPayload = {
          purpose: 'oauth_link',
          providerName,
          oauthId: normalizedUser.id,
          oauthUsername: normalizedUser.username,
          oauthEmail: normalizedUser.email,
          targetUserId: result.existingUser.id,
          targetUsername: result.existingUser.username,
        };
        const linkToken = jwt.sign(linkPayload, LINK_TOKEN_SECRET, {
          expiresIn: '5m',
          issuer: LINK_TOKEN_ISSUER,
          audience: LINK_TOKEN_AUDIENCE,
        });
        const params = new URLSearchParams({
          linkRequired: 'true',
          linkToken,
          username: result.existingUser.username,
        });
        res.redirect(`${completeUrl}?${params.toString()}`);
        return;
      }

      const accessToken = generateAccessToken(result.id, result.email ?? '');
      const refreshToken = generateRefreshToken(result.id, result.email ?? '');
      await query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
         VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
        [result.id, hashToken(refreshToken), req.get('user-agent') || null, req.ip]
      );
      await updateLastLogin(result.id);

      // Short-lived cookies bridge the redirect flow. The frontend
      // OAuthCallback page reads them, persists to localStorage, and clears them.
      const cookieOpts = {
        httpOnly: false,
        secure: req.secure,
        sameSite: 'lax' as const,
        maxAge: 60 * 1000,
      };
      res.cookie('trajectory_access_token', accessToken, cookieOpts);
      res.cookie('trajectory_refresh_token', refreshToken, cookieOpts);
      res.cookie(
        'trajectory_user',
        JSON.stringify({
          id: result.id,
          email: result.email,
          username: result.username,
          isInstanceAdmin: result.isInstanceAdmin,
          onboardingCompleted: result.onboardingCompleted,
        }),
        cookieOpts
      );

      res.redirect(completeUrl);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      console.error('OAuth callback failed:', raw);
      let userMessage = 'Authentication failed. Please try again or contact your administrator.';
      if (raw.includes('Token exchange failed')) {
        userMessage =
          'Unable to complete sign-in. The sign-in service may be experiencing issues. Please try again.';
      } else if (raw.includes('ID token validation failed')) {
        userMessage =
          'Sign-in verification failed. Please try again or contact your administrator.';
      } else if (raw.includes('SSO provider unavailable')) {
        userMessage = 'Sign-in service is currently unavailable. Please try again later.';
      } else if (raw.startsWith('linked to a different SSO provider')) {
        userMessage = raw;
      }
      redirectError(userMessage);
    }
  })
);

/**
 * POST /api/auth/oauth/link
 * Completes account linking when a user signs in with OAuth but their existing
 * account has a password — they confirm by providing the password.
 */
oauthRouter.post(
  '/link',
  asyncHandler(async (req: Request, res: Response) => {
    const { linkToken, password } = req.body as { linkToken?: unknown; password?: unknown };
    if (typeof linkToken !== 'string' || typeof password !== 'string' || !linkToken || !password) {
      throw new BadRequestError('Link token and password are required');
    }

    let payload: LinkTokenPayload;
    try {
      const decoded = jwt.verify(linkToken, LINK_TOKEN_SECRET, {
        issuer: LINK_TOKEN_ISSUER,
        audience: LINK_TOKEN_AUDIENCE,
      });
      if (typeof decoded === 'string' || (decoded as LinkTokenPayload).purpose !== 'oauth_link') {
        throw new Error('Invalid link token');
      }
      payload = decoded as LinkTokenPayload;
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.name === 'TokenExpiredError'
          ? 'This linking session has expired. Please try signing in with SSO again.'
          : 'Invalid linking session. Please try signing in with SSO again.';
      throw new BadRequestError(message);
    }

    const user = await getUserByUsernameForOAuth(payload.targetUsername);
    if (!user || user.id !== payload.targetUserId) {
      throw new BadRequestError('User account not found');
    }
    if (!user.password_hash) {
      throw new BadRequestError('Account cannot be linked: no password is set');
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedError('Incorrect password');
    }

    await linkOAuthToUser(user.id, payload.providerName, payload.oauthId);

    const accessToken = generateAccessToken(user.id, user.email ?? '');
    const refreshToken = generateRefreshToken(user.id, user.email ?? '');
    await query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [user.id, hashToken(refreshToken), req.get('user-agent') || null, req.ip]
    );
    await updateLastLogin(user.id);

    res.json(
      createResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isInstanceAdmin: user.is_instance_admin,
          onboardingCompleted: user.onboarding_completed,
        },
        accessToken,
        refreshToken,
      })
    );
  })
);

interface ResolvedOAuthUser {
  id: number;
  username: string;
  email: string | null;
  isInstanceAdmin: boolean;
  onboardingCompleted: boolean;
}

interface LinkRequiredResult {
  linkRequired: true;
  existingUser: { id: number; username: string };
}

/**
 * Resolve an OAuth identity to a local user.
 *
 * Order:
 *   1. Linked OAuth identity → return user.
 *   2. Email match: if the existing user has no password, link silently.
 *      If they have a different OAuth provider, error. Otherwise → link required.
 *   3. Username match: same logic as email.
 *   4. No match → auto-register (if enabled). First user becomes instance admin.
 */
async function resolveOAuthUser(
  providerName: string,
  normalizedUser: NormalizedOAuthUser
): Promise<ResolvedOAuthUser | LinkRequiredResult> {
  const existingByOAuth = await getUserByOAuthId(providerName, normalizedUser.id);
  if (existingByOAuth) {
    return toResolved(existingByOAuth);
  }

  if (normalizedUser.email) {
    const existingByEmail = await getUserByEmailForOAuth(normalizedUser.email);
    if (existingByEmail) {
      if (existingByEmail.oauth_provider && existingByEmail.oauth_provider !== providerName) {
        throw new Error(
          `This email is already linked to a different SSO provider (${existingByEmail.oauth_provider}). Please sign in with that provider instead.`
        );
      }
      if (existingByEmail.password_hash) {
        return {
          linkRequired: true,
          existingUser: { id: existingByEmail.id, username: existingByEmail.username },
        };
      }
      await linkOAuthToUser(existingByEmail.id, providerName, normalizedUser.id);
      return toResolved({
        ...existingByEmail,
        oauth_provider: providerName,
        oauth_provider_id: normalizedUser.id,
      });
    }
  }

  const existingByUsername = await getUserByUsernameForOAuth(normalizedUser.username);
  if (existingByUsername) {
    if (existingByUsername.password_hash) {
      return {
        linkRequired: true,
        existingUser: { id: existingByUsername.id, username: existingByUsername.username },
      };
    }
    if (
      existingByUsername.oauth_provider &&
      existingByUsername.oauth_provider !== providerName
    ) {
      throw new Error(
        'An account with this username already exists and is linked to a different SSO provider. Please contact your administrator.'
      );
    }
    await linkOAuthToUser(existingByUsername.id, providerName, normalizedUser.id);
    return toResolved({
      ...existingByUsername,
      oauth_provider: providerName,
      oauth_provider_id: normalizedUser.id,
    });
  }

  const settings = getProviderSettings(providerName);
  if (!settings.autoRegister) {
    throw new Error(
      'No account found for this identity. Please contact your administrator to create an account.'
    );
  }

  const isFirstUser = !(await hasAnyUsers());
  const created = await createOAuthUser({
    username: normalizedUser.username,
    email: normalizedUser.email,
    oauthProvider: providerName,
    oauthProviderId: normalizedUser.id,
    isInstanceAdmin: isFirstUser,
  });
  return toResolved(created);
}

function toResolved(row: OAuthUserRow): ResolvedOAuthUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isInstanceAdmin: row.is_instance_admin,
    onboardingCompleted: row.onboarding_completed,
  };
}
