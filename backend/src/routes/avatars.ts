/**
 * Child Avatar Routes
 * Handles avatar uploads and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { createResponse } from '../types/api.js';

const router = Router();

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
  upload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Verify child exists and get old avatar
      const childCheck = await query<{ exists: boolean; avatar: string | null }>(
        'SELECT EXISTS(SELECT 1 FROM children WHERE id = $1) as exists, avatar FROM children WHERE id = $1',
        [childId]
      );

      if (!childCheck.rows[0] || !childCheck.rows[0].exists) {
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

      const oldAvatar = childCheck.rows[0].avatar;

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
// Get avatar file
// ============================================================================

router.get(
  '/avatars/:filename',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filename = req.params.filename;

      // Basic security: prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          error: {
            message: 'Invalid filename',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }

      const filePath = path.join(AVATAR_DIR, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          error: {
            message: 'Avatar not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      // Determine content type from extension
      const ext = path.extname(filename).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      // Read file and send as buffer
      const fileBuffer = await fs.readFile(filePath);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Delete avatar
// ============================================================================

router.delete(
  '/children/:childId/avatar',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Get child's current avatar
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

export default router;
