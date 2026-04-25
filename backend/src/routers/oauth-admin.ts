/**
 * Admin CRUD routes for OAuth/OIDC providers. Instance admin only.
 * Mounted at /api/admin/oauth-providers.
 */

import { Router, Response, NextFunction } from 'express';
import { authenticate, requireInstanceAdmin, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { createResponse } from '../types/api.js';
import {
  getAllOAuthProviders,
  getOAuthProviderById,
  createOAuthProviderRow,
  updateOAuthProviderRow,
  deleteOAuthProviderRow,
  type OAuthProviderRow,
} from '../db/oauth.js';
import { reloadOAuthProviders } from '../features/auth/service/oauth/index.js';

export const oauthAdminRouter = Router();

oauthAdminRouter.use(authenticate);
oauthAdminRouter.use(requireInstanceAdmin);

const SUPPORTED_TYPES = new Set(['authentik', 'generic_oidc']);

interface ProviderInput {
  name?: string;
  displayName?: string;
  providerType?: string;
  clientId?: string;
  clientSecret?: string;
  issuerUrl?: string;
  scopes?: string;
  autoRegister?: boolean;
  enabled?: boolean;
}

function shapeForResponse(row: OAuthProviderRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    providerType: row.provider_type,
    clientId: row.client_id,
    issuerUrl: row.issuer_url,
    scopes: row.scopes,
    autoRegister: row.auto_register,
    enabled: row.enabled,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    // client_secret intentionally omitted from responses
    hasClientSecret: !!row.client_secret,
  };
}

oauthAdminRouter.get(
  '/',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const rows = await getAllOAuthProviders();
    res.json(createResponse(rows.map(shapeForResponse)));
  })
);

oauthAdminRouter.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as ProviderInput;
    const name = (body.name ?? '').trim();
    const displayName = (body.displayName ?? '').trim();
    const providerType = (body.providerType ?? '').trim().toLowerCase();
    const clientId = (body.clientId ?? '').trim();
    const clientSecret = body.clientSecret ?? '';
    const issuerUrl = (body.issuerUrl ?? '').trim();
    const scopes = (body.scopes ?? 'openid,profile,email').trim();

    if (!name) throw new BadRequestError('name is required');
    if (!displayName) throw new BadRequestError('displayName is required');
    if (!SUPPORTED_TYPES.has(providerType))
      throw new BadRequestError('providerType must be one of: authentik, generic_oidc');
    if (!clientId) throw new BadRequestError('clientId is required');
    if (!clientSecret) throw new BadRequestError('clientSecret is required');
    try {
      new URL(issuerUrl);
    } catch {
      throw new BadRequestError('issuerUrl must be a valid URL');
    }

    const row = await createOAuthProviderRow({
      name,
      displayName,
      providerType,
      clientId,
      clientSecret,
      issuerUrl,
      scopes,
      autoRegister: body.autoRegister ?? true,
      enabled: body.enabled ?? true,
    });

    await reloadOAuthProviders();
    res.status(201).json(createResponse(shapeForResponse(row)));
  })
);

oauthAdminRouter.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) throw new BadRequestError('Invalid provider id');

    const existing = await getOAuthProviderById(id);
    if (!existing) throw new NotFoundError('OAuth provider');

    const body = req.body as ProviderInput;
    if (body.providerType && !SUPPORTED_TYPES.has(body.providerType.toLowerCase())) {
      throw new BadRequestError('providerType must be one of: authentik, generic_oidc');
    }
    if (body.issuerUrl) {
      try {
        new URL(body.issuerUrl);
      } catch {
        throw new BadRequestError('issuerUrl must be a valid URL');
      }
    }

    const updated = await updateOAuthProviderRow(id, {
      displayName: body.displayName,
      providerType: body.providerType?.toLowerCase(),
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      issuerUrl: body.issuerUrl,
      scopes: body.scopes,
      autoRegister: body.autoRegister,
      enabled: body.enabled,
    });
    if (!updated) throw new NotFoundError('OAuth provider');

    await reloadOAuthProviders();
    res.json(createResponse(shapeForResponse(updated)));
  })
);

oauthAdminRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) throw new BadRequestError('Invalid provider id');
    const deleted = await deleteOAuthProviderRow(id);
    if (!deleted) throw new NotFoundError('OAuth provider');
    await reloadOAuthProviders();
    res.status(204).send();
  })
);
