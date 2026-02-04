/**
 * Child Avatar Routes
 * Handles avatar uploads and management. All endpoints require auth; avatars are scoped to the user's family.
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { createResponse } from '../types/api.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { canAccessChild, canEditChild } from '../features/families/service/family-access.js';
import { ForbiddenError } from '../middleware/error-handler.js';
import { verifyToken } from '../features/auth/service/auth.js';

const router = Router();

// Router for GET /api/avatars/* only (mounted at /api/avatars so it never hits attachmentsRouter auth)
const avatarFilesRouter = Router();

// Avatar storage configuration
const AVATAR_DIR = process.env.AVATAR_DIR || '/app/avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Ensure avatar directory exists
async function ensureAvatarDir() {
  try {
    await fs.access(AVATAR_DIR);
  } catch {
    await fs.mkdir(AVATAR_DIR, { recursive: true });
  }
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    await ensureAvatarDir();
    cb(null, AVATAR_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `avatar-${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Only images allowed for avatars`));
    }
  },
});

// ============================================================================
// Upload avatar for child
// ============================================================================

router.post(
  '/children/:childId/avatar',
  authenticate,
  upload.single('avatar'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const childId = parseInt(req.params.childId);

      if (isNaN(childId)) {
        res.status(400).json({
          error: {
            message: 'Invalid child ID',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }
      if (!(await canAccessChild(req.userId!, childId))) {
        if (req.file) await fs.unlink(req.file.path);
        res.status(404).json({
          error: {
            message: 'Child not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }
      if (!(await canEditChild(req.userId!, childId))) {
        if (req.file) await fs.unlink(req.file.path);
        throw new ForbiddenError('You do not have permission to update this child\'s avatar.');
      }

      if (!req.file) {
        res.status(400).json({
          error: {
            message: 'No file uploaded',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }

      const childCheck = await query<{ avatar: string | null }>(
        'SELECT avatar FROM children WHERE id = $1',
        [childId]
      );

      if (childCheck.rows.length === 0) {
        // Delete uploaded file
        await fs.unlink(req.file.path);
        res.status(404).json({
          error: {
            message: 'Child not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      const oldAvatar = childCheck.rows[0]?.avatar ?? null;

      // Update child with new avatar
      await query(
        'UPDATE children SET avatar = $1, updated_at = NOW() WHERE id = $2',
        [req.file.filename, childId]
      );

      // Delete old avatar file if it exists
      if (oldAvatar) {
        const oldAvatarPath = path.join(AVATAR_DIR, oldAvatar);
        try {
          await fs.unlink(oldAvatarPath);
        } catch (err) {
          console.error('Failed to delete old avatar:', err);
          // Continue - not critical
        }
      }

      res.json(createResponse({ avatar: req.file.filename }));
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      next(error);
    }
  }
);

// ============================================================================
// Get avatar file (avatarFilesRouter mounted at /api/avatars so path is e.g. /default-boy.svg or /:filename)
// ============================================================================

// Helper function to serve default avatar SVG
function serveDefaultAvatar(res: Response, isBoy: boolean): void {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="100" fill="${isBoy ? '#4A90E2' : '#E91E63'}"/>
  <circle cx="100" cy="80" r="35" fill="#FFFFFF"/>
  <ellipse cx="100" cy="140" rx="50" ry="40" fill="#FFFFFF"/>
</svg>`;
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(svg);
  }
}

// Explicit routes for default avatars (must come BEFORE parameterized route)
avatarFilesRouter.get(
  '/default-boy.svg',
  async (_req: Request, res: Response): Promise<void> => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="100" fill="#4A90E2"/>
  <circle cx="100" cy="80" r="35" fill="#FFFFFF"/>
  <ellipse cx="100" cy="140" rx="50" ry="40" fill="#FFFFFF"/>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(svg);
  }
);

avatarFilesRouter.get(
  '/default-girl.svg',
  async (_req: Request, res: Response): Promise<void> => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="100" fill="#E91E63"/>
  <circle cx="100" cy="80" r="35" fill="#FFFFFF"/>
  <ellipse cx="100" cy="140" rx="50" ry="40" fill="#FFFFFF"/>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(svg);
  }
);

// Parameterized route for user-uploaded avatars (requires authentication)
avatarFilesRouter.get(
  '/:filename',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const filename = req.params?.filename || req.path?.split('/').pop() || req.url?.split('/').pop()?.split('?')[0] || '';

    const isDefaultBoy = filename === 'default-boy.svg';
    const isDefaultGirl = filename === 'default-girl.svg';
    if (isDefaultBoy || isDefaultGirl) {
      serveDefaultAvatar(res, isDefaultBoy);
      return;
    }

    try {
      if (res.headersSent) return;

      const authReq = req as AuthRequest;
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
        token = req.query.token.trim();
      }
      if (!token) {
        res.status(401).json({
          error: { message: 'Missing or invalid authorization', type: 'UnauthorizedError', statusCode: 401 },
        });
        return;
      }

      try {
        const { userId, email } = verifyToken(token, false);
        authReq.userId = userId;
        authReq.userEmail = email;
      } catch {
        res.status(401).json({
          error: { message: 'Invalid or expired token', type: 'UnauthorizedError', statusCode: 401 },
        });
        return;
      }

      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          error: { message: 'Invalid filename', type: 'ValidationError', statusCode: 400 },
        });
        return;
      }

      const childWithAvatar = await query<{ id: number }>(
        'SELECT id FROM children WHERE avatar = $1',
        [filename]
      );
      if (childWithAvatar.rows.length === 0 || !(await canAccessChild(authReq.userId!, childWithAvatar.rows[0].id))) {
        res.status(404).json({
          error: { message: 'Avatar not found', type: 'NotFoundError', statusCode: 404 },
        });
        return;
      }

      const filePath = path.join(AVATAR_DIR, filename);
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          error: { message: 'Avatar not found', type: 'NotFoundError', statusCode: 404 },
        });
        return;
      }

      const ext = path.extname(filename).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      };
      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      const fileBuffer = await fs.readFile(filePath);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.send(fileBuffer);
    } catch (error) {
      const caughtFilename = req.params?.filename || req.path?.split('/').pop() || '';
      if (caughtFilename === 'default-boy.svg' || caughtFilename === 'default-girl.svg') {
        serveDefaultAvatar(res, caughtFilename === 'default-boy.svg');
        return;
      }
      next(error);
    }
  }
);

// ============================================================================
// Delete avatar
// ============================================================================

router.delete(
  '/children/:childId/avatar',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const childId = parseInt(req.params.childId);

      if (isNaN(childId)) {
        res.status(400).json({
          error: {
            message: 'Invalid child ID',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }
      if (!(await canAccessChild(req.userId!, childId))) {
        res.status(404).json({
          error: {
            message: 'Child not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }
      if (!(await canEditChild(req.userId!, childId))) {
        throw new ForbiddenError('You do not have permission to delete this child\'s avatar.');
      }

      const result = await query<{ avatar: string | null }>(
        'SELECT avatar FROM children WHERE id = $1',
        [childId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          error: {
            message: 'Child not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      const avatar = result.rows[0].avatar;

      // Remove avatar from database
      await query(
        'UPDATE children SET avatar = NULL, updated_at = NOW() WHERE id = $1',
        [childId]
      );

      // Delete file from disk
      if (avatar) {
        const filePath = path.join(AVATAR_DIR, avatar);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error('Failed to delete avatar file:', err);
          // Continue - database is updated
        }
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default { avatarFilesRouter, default: router };
