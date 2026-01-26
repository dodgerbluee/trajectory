/**
 * Measurement Attachments Routes
 * Handles file uploads, downloads, and management
 */

import { Router, Response, NextFunction } from 'express';
import type { Request as ExpressRequest } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import type { MeasurementAttachmentRow, VisitAttachmentRow, ChildAttachmentRow } from '../types/database.js';
import { createResponse } from '../types/api.js';

// Extend Express Request type to include file
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

const router = Router();

// File storage configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Check if stored_filename exists in ANY attachment table
 * This prevents overwriting existing files across all attachment types
 */
async function checkStoredFilenameExists(storedFilename: string): Promise<boolean> {
  // Check all three tables in parallel
  const [measurementResult, visitResult, childResult] = await Promise.all([
    query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM measurement_attachments WHERE stored_filename = $1) as exists',
      [storedFilename]
    ),
    query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM visit_attachments WHERE stored_filename = $1) as exists',
      [storedFilename]
    ),
    query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM child_attachments WHERE stored_filename = $1) as exists',
      [storedFilename]
    ),
  ]);

  return (
    measurementResult.rows[0].exists ||
    visitResult.rows[0].exists ||
    childResult.rows[0].exists
  );
}

/**
 * Check if file already exists on disk
 */
async function checkFileExistsOnDisk(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify stored_filename uniqueness after insert
 * Checks that no other records (excluding the one we just inserted) have this filename
 */
async function verifyStoredFilenameUniqueAfterInsert(
  storedFilename: string,
  insertedId: number,
  tableType: 'measurement' | 'visit' | 'child'
): Promise<boolean> {
  const checks = await Promise.all([
    tableType === 'measurement'
      ? query<{ count: number }>(
          'SELECT COUNT(*) as count FROM measurement_attachments WHERE stored_filename = $1 AND id != $2',
          [storedFilename, insertedId]
        )
      : query<{ count: number }>(
          'SELECT COUNT(*) as count FROM measurement_attachments WHERE stored_filename = $1',
          [storedFilename]
        ),
    tableType === 'visit'
      ? query<{ count: number }>(
          'SELECT COUNT(*) as count FROM visit_attachments WHERE stored_filename = $1 AND id != $2',
          [storedFilename, insertedId]
        )
      : query<{ count: number }>(
          'SELECT COUNT(*) as count FROM visit_attachments WHERE stored_filename = $1',
          [storedFilename]
        ),
    tableType === 'child'
      ? query<{ count: number }>(
          'SELECT COUNT(*) as count FROM child_attachments WHERE stored_filename = $1 AND id != $2',
          [storedFilename, insertedId]
        )
      : query<{ count: number }>(
          'SELECT COUNT(*) as count FROM child_attachments WHERE stored_filename = $1',
          [storedFilename]
        ),
  ]);

  const totalOtherRecords =
    parseInt(checks[0].rows[0].count.toString()) +
    parseInt(checks[1].rows[0].count.toString()) +
    parseInt(checks[2].rows[0].count.toString());

  return totalOtherRecords === 0;
}


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req: ExpressRequest, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void): Promise<void> => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: ExpressRequest, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void): void => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req: ExpressRequest, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: images and PDF`));
    }
  },
});

// ============================================================================
// Upload attachment to measurement
// ============================================================================

router.post(
  '/measurements/:measurementId/attachments',
  upload.single('file'),
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const measurementId = parseInt(req.params.measurementId);

      if (isNaN(measurementId)) {
        res.status(400).json({
          error: {
            message: 'Invalid measurement ID',
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

      // CRITICAL: Verify stored_filename doesn't exist in ANY table to prevent overwrites
      // If collision detected, generate new filename and rename file (retry up to 5 times)
      let finalStoredFilename = req.file.filename;
      let finalFilePath = req.file.path;
      let collisionDetected = await checkStoredFilenameExists(finalStoredFilename);
      let retryCount = 0;
      const maxRetries = 5;

      while (collisionDetected && retryCount < maxRetries) {
        console.warn(`Stored filename collision detected: ${finalStoredFilename} (retry ${retryCount + 1}/${maxRetries})`);
        
        // Generate new filename
        const ext = path.extname(req.file.originalname);
        const newFilename = `${randomUUID()}${ext}`;
        const newFilePath = path.join(UPLOAD_DIR, newFilename);
        
        // Rename the file
        try {
          await fs.rename(finalFilePath, newFilePath);
          finalStoredFilename = newFilename;
          finalFilePath = newFilePath;
          collisionDetected = await checkStoredFilenameExists(finalStoredFilename);
          retryCount++;
        } catch (renameError) {
          // If rename fails, delete the file and return error
          await fs.unlink(finalFilePath);
          res.status(500).json({
            error: {
              message: 'Failed to resolve filename collision. Please try uploading again.',
              type: 'InternalError',
              statusCode: 500,
            },
          });
          return;
        }
      }

      if (collisionDetected) {
        // Still have collision after retries - delete file and return error
        await fs.unlink(finalFilePath);
        res.status(409).json({
          error: {
            message: 'Unable to generate unique filename after multiple attempts. Please try uploading again.',
            type: 'ConflictError',
            statusCode: 409,
          },
        });
        return;
      }

      // CRITICAL: Verify file on disk exists (safety check)
      const fileExistsOnDisk = await checkFileExistsOnDisk(finalFilePath);
      if (!fileExistsOnDisk) {
        res.status(500).json({
          error: {
            message: 'File upload failed: file was not saved to disk',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // Verify measurement exists
      const measurementCheck = await query<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM measurements WHERE id = $1)',
        [measurementId]
      );

      if (!measurementCheck.rows[0].exists) {
        // Delete uploaded file
        await fs.unlink(finalFilePath);
        res.status(404).json({
          error: {
            message: 'Measurement not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      // Save attachment record to database with verified unique filename
      const result = await query<MeasurementAttachmentRow>(
        `INSERT INTO measurement_attachments 
         (measurement_id, original_filename, stored_filename, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          measurementId,
          req.file.originalname,
          finalStoredFilename, // Use verified unique filename
          req.file.mimetype,
          req.file.size,
        ]
      );

      // CRITICAL: Verify the file still exists after database insert
      const fileStillExists = await checkFileExistsOnDisk(finalFilePath);
      if (!fileStillExists) {
        // Rollback: delete database record if file disappeared
        await query('DELETE FROM measurement_attachments WHERE id = $1', [result.rows[0].id]);
        res.status(500).json({
          error: {
            message: 'File verification failed: file was lost after database insert',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // CRITICAL: Verify the database record matches what we inserted
      if (result.rows[0].stored_filename !== finalStoredFilename) {
        // Database record doesn't match - rollback
        await query('DELETE FROM measurement_attachments WHERE id = $1', [result.rows[0].id]);
        await fs.unlink(finalFilePath);
        res.status(500).json({
          error: {
            message: 'File verification failed: database record mismatch',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // CRITICAL: Verify no other record has this filename
      const isUnique = await verifyStoredFilenameUniqueAfterInsert(
        finalStoredFilename,
        result.rows[0].id,
        'measurement'
      );
      if (!isUnique) {
        // Another record has this filename - rollback
        await query('DELETE FROM measurement_attachments WHERE id = $1', [result.rows[0].id]);
        await fs.unlink(finalFilePath);
        res.status(500).json({
          error: {
            message: 'File verification failed: filename conflict detected after insert',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      const attachment = {
        id: result.rows[0].id,
        measurement_id: result.rows[0].measurement_id,
        original_filename: result.rows[0].original_filename,
        stored_filename: result.rows[0].stored_filename,
        file_type: result.rows[0].file_type,
        file_size: result.rows[0].file_size,
        created_at: result.rows[0].created_at.toISOString(),
      };

      res.status(201).json(createResponse(attachment));
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
// Get all attachments for a measurement
// ============================================================================

router.get(
  '/measurements/:measurementId/attachments',
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const measurementId = parseInt(req.params.measurementId);

      if (isNaN(measurementId)) {
        res.status(400).json({
          error: {
            message: 'Invalid measurement ID',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }

      const result = await query<MeasurementAttachmentRow>(
        `SELECT * FROM measurement_attachments 
         WHERE measurement_id = $1 
         ORDER BY created_at DESC`,
        [measurementId]
      );

      const attachments = result.rows.map((row) => ({
        id: row.id,
        measurement_id: row.measurement_id,
        original_filename: row.original_filename,
        stored_filename: row.stored_filename,
        file_type: row.file_type,
        file_size: row.file_size,
        created_at: row.created_at.toISOString(),
      }));

      res.json(createResponse(attachments));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Download/view attachment
// ============================================================================

router.get(
  '/attachments/:id',
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          error: {
            message: 'Invalid attachment ID',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }

      // Check all three attachment tables
      // Priority order: child_attachments first (for vaccine documents), then visit_attachments, then measurement_attachments
      // This ensures child attachments are found even if IDs overlap across tables
      let attachment: MeasurementAttachmentRow | VisitAttachmentRow | ChildAttachmentRow | null = null;

      // Check child_attachments first (highest priority)
      const childResult = await query<ChildAttachmentRow>(
        'SELECT * FROM child_attachments WHERE id = $1',
        [id]
      );
      if (childResult.rows.length > 0) {
        attachment = childResult.rows[0];
      } else {
        // Check visit_attachments
        const visitResult = await query<VisitAttachmentRow>(
          'SELECT * FROM visit_attachments WHERE id = $1',
          [id]
        );
        if (visitResult.rows.length > 0) {
          attachment = visitResult.rows[0];
        } else {
          // Check measurement_attachments last
          const measurementResult = await query<MeasurementAttachmentRow>(
            'SELECT * FROM measurement_attachments WHERE id = $1',
            [id]
          );
          if (measurementResult.rows.length > 0) {
            attachment = measurementResult.rows[0];
          }
        }
      }

      if (!attachment) {
        res.status(404).json({
          error: {
            message: 'Attachment not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      const filePath = path.join(UPLOAD_DIR, attachment.stored_filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          error: {
            message: 'File not found on disk',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      // Set appropriate headers
      res.setHeader('Content-Type', attachment.file_type);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(attachment.original_filename)}"`
      );

      // Stream file to response
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Delete attachment
// ============================================================================

router.delete(
  '/attachments/:id',
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          error: {
            message: 'Invalid attachment ID',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }

      // Get attachment info before deleting - check all three tables
      let result = await query<MeasurementAttachmentRow>(
        'SELECT * FROM measurement_attachments WHERE id = $1',
        [id]
      );

      let attachment: MeasurementAttachmentRow | VisitAttachmentRow | ChildAttachmentRow | null = null;
      let attachmentType: 'measurement' | 'visit' | 'child' = 'measurement';

      if (result.rows.length > 0) {
        attachment = result.rows[0];
      } else {
        // Check visit_attachments
        const visitResult = await query<VisitAttachmentRow>(
          'SELECT * FROM visit_attachments WHERE id = $1',
          [id]
        );
        if (visitResult.rows.length > 0) {
          attachment = visitResult.rows[0];
          attachmentType = 'visit';
        } else {
          // Check child_attachments
          const childResult = await query<ChildAttachmentRow>(
            'SELECT * FROM child_attachments WHERE id = $1',
            [id]
          );
          if (childResult.rows.length > 0) {
            attachment = childResult.rows[0];
            attachmentType = 'child';
          }
        }
      }

      if (!attachment) {
        res.status(404).json({
          error: {
            message: 'Attachment not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      // Delete from database
      if (attachmentType === 'measurement') {
        await query('DELETE FROM measurement_attachments WHERE id = $1', [id]);
      } else if (attachmentType === 'visit') {
        await query('DELETE FROM visit_attachments WHERE id = $1', [id]);
      } else {
        await query('DELETE FROM child_attachments WHERE id = $1', [id]);
      }

      // Delete file from disk
      const filePath = path.join(UPLOAD_DIR, attachment.stored_filename);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Failed to delete file from disk:', unlinkError);
        // Continue - database record is deleted
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Upload attachment to visit
// ============================================================================

router.post(
  '/visits/:visitId/attachments',
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const visitId = parseInt(req.params.visitId);

      if (isNaN(visitId)) {
        res.status(400).json({
          error: {
            message: 'Invalid visit ID',
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

      // CRITICAL: Verify stored_filename doesn't exist in ANY table to prevent overwrites
      // If collision detected, generate new filename and rename file (retry up to 5 times)
      let finalStoredFilename = req.file.filename;
      let finalFilePath = req.file.path;
      let collisionDetected = await checkStoredFilenameExists(finalStoredFilename);
      let retryCount = 0;
      const maxRetries = 5;

      while (collisionDetected && retryCount < maxRetries) {
        console.warn(`Stored filename collision detected: ${finalStoredFilename} (retry ${retryCount + 1}/${maxRetries})`);
        
        // Generate new filename
        const ext = path.extname(req.file.originalname);
        const newFilename = `${randomUUID()}${ext}`;
        const newFilePath = path.join(UPLOAD_DIR, newFilename);
        
        // Rename the file
        try {
          await fs.rename(finalFilePath, newFilePath);
          finalStoredFilename = newFilename;
          finalFilePath = newFilePath;
          collisionDetected = await checkStoredFilenameExists(finalStoredFilename);
          retryCount++;
        } catch (renameError) {
          // If rename fails, delete the file and return error
          await fs.unlink(finalFilePath);
          res.status(500).json({
            error: {
              message: 'Failed to resolve filename collision. Please try uploading again.',
              type: 'InternalError',
              statusCode: 500,
            },
          });
          return;
        }
      }

      if (collisionDetected) {
        // Still have collision after retries - delete file and return error
        await fs.unlink(finalFilePath);
        res.status(409).json({
          error: {
            message: 'Unable to generate unique filename after multiple attempts. Please try uploading again.',
            type: 'ConflictError',
            statusCode: 409,
          },
        });
        return;
      }

      // CRITICAL: Verify file on disk exists (safety check)
      const fileExistsOnDisk = await checkFileExistsOnDisk(finalFilePath);
      if (!fileExistsOnDisk) {
        res.status(500).json({
          error: {
            message: 'File upload failed: file was not saved to disk',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // Verify visit exists
      const visitCheck = await query<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM visits WHERE id = $1)',
        [visitId]
      );

      if (!visitCheck.rows[0].exists) {
        // Delete uploaded file
        await fs.unlink(finalFilePath);
        res.status(404).json({
          error: {
            message: 'Visit not found',
            type: 'NotFoundError',
            statusCode: 404,
          },
        });
        return;
      }

      // Save attachment record to database with verified unique filename
      const result = await query<VisitAttachmentRow>(
        `INSERT INTO visit_attachments 
         (visit_id, original_filename, stored_filename, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          visitId,
          req.file.originalname,
          finalStoredFilename, // Use verified unique filename
          req.file.mimetype,
          req.file.size,
        ]
      );

      // CRITICAL: Verify the file still exists after database insert
      const fileStillExists = await checkFileExistsOnDisk(finalFilePath);
      if (!fileStillExists) {
        // Rollback: delete database record if file disappeared
        await query('DELETE FROM visit_attachments WHERE id = $1', [result.rows[0].id]);
        res.status(500).json({
          error: {
            message: 'File verification failed: file was lost after database insert',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // CRITICAL: Verify the database record matches what we inserted
      if (result.rows[0].stored_filename !== finalStoredFilename) {
        // Database record doesn't match - rollback
        await query('DELETE FROM visit_attachments WHERE id = $1', [result.rows[0].id]);
        await fs.unlink(finalFilePath);
        res.status(500).json({
          error: {
            message: 'File verification failed: database record mismatch',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // CRITICAL: Verify no other record has this filename
      const isUnique = await verifyStoredFilenameUniqueAfterInsert(
        finalStoredFilename,
        result.rows[0].id,
        'visit'
      );
      if (!isUnique) {
        // Another record has this filename - rollback
        await query('DELETE FROM visit_attachments WHERE id = $1', [result.rows[0].id]);
        await fs.unlink(finalFilePath);
        res.status(500).json({
          error: {
            message: 'File verification failed: filename conflict detected after insert',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      const attachment = {
        id: result.rows[0].id,
        visit_id: result.rows[0].visit_id,
        original_filename: result.rows[0].original_filename,
        stored_filename: result.rows[0].stored_filename,
        file_type: result.rows[0].file_type,
        file_size: result.rows[0].file_size,
        created_at: result.rows[0].created_at.toISOString(),
        updated_at: result.rows[0].created_at.toISOString(), // visit_attachments doesn't have updated_at, use created_at
      };

      // Insert history entry for attachment upload
      await query(
        `INSERT INTO visit_history (visit_id, user_id, action, description)
         VALUES ($1, $2, 'attachment_uploaded', $3)`,
        [
          visitId,
          req.userId || null,
          `Document uploaded: ${req.file.originalname}`
        ]
      );

      res.status(201).json(createResponse(attachment));
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
// Get all attachments for a visit
// ============================================================================

router.get(
  '/visits/:visitId/attachments',
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const visitId = parseInt(req.params.visitId);

      if (isNaN(visitId)) {
        res.status(400).json({
          error: {
            message: 'Invalid visit ID',
            type: 'ValidationError',
            statusCode: 400,
          },
        });
        return;
      }

      const result = await query<VisitAttachmentRow>(
        `SELECT * FROM visit_attachments 
         WHERE visit_id = $1 
         ORDER BY created_at DESC`,
        [visitId]
      );

      const attachments = result.rows.map((row) => ({
        id: row.id,
        visit_id: row.visit_id,
        original_filename: row.original_filename,
        stored_filename: row.stored_filename,
        file_type: row.file_type,
        file_size: row.file_size,
        created_at: row.created_at.toISOString(),
        updated_at: row.created_at.toISOString(), // visit_attachments doesn't have updated_at, use created_at
      }));

      res.json(createResponse(attachments));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Update attachment filename (works for both measurement and visit attachments)
// ============================================================================

router.put('/attachments/:id', async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attachmentId = parseInt(req.params.id);
    const { original_filename } = req.body;

    if (isNaN(attachmentId)) {
      res.status(400).json({
        error: {
          message: 'Invalid attachment ID',
          type: 'ValidationError',
          statusCode: 400,
        },
      });
      return;
    }

    if (!original_filename || typeof original_filename !== 'string' || original_filename.trim().length === 0) {
      res.status(400).json({
        error: {
          message: 'Original filename is required',
          type: 'ValidationError',
          statusCode: 400,
        },
      });
      return;
    }

    // Try measurement_attachments first
    let result = await query(
      'UPDATE measurement_attachments SET original_filename = $1 WHERE id = $2 RETURNING id',
      [original_filename.trim(), attachmentId]
    );

    if (result.rows.length === 0) {
      // Try visit_attachments
      result = await query(
        'UPDATE visit_attachments SET original_filename = $1 WHERE id = $2 RETURNING id',
        [original_filename.trim(), attachmentId]
      );
    }

    if (result.rows.length === 0) {
      res.status(404).json({
        error: {
          message: 'Attachment not found',
          type: 'NotFoundError',
          statusCode: 404,
        },
      });
      return;
    }

    res.json(createResponse({ success: true }));
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// Download/view visit attachment (reuse same endpoint, check both tables)
// ============================================================================

// Update the existing /attachments/:id endpoint to check both tables
// We'll keep it as-is but it will work for both measurement and visit attachments
// since they share the same ID space (both are SERIAL PRIMARY KEY)

// ============================================================================
// Child Attachments - Upload vaccine report or other child-level documents
// ============================================================================

router.post(
  '/children/:childId/attachments',
  upload.single('file'),
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
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

      // CRITICAL: Verify stored_filename doesn't exist in ANY table to prevent overwrites
      // If collision detected, generate new filename and rename file (retry up to 5 times)
      let finalStoredFilename = req.file.filename;
      let finalFilePath = req.file.path;
      let collisionDetected = await checkStoredFilenameExists(finalStoredFilename);
      let retryCount = 0;
      const maxRetries = 5;

      while (collisionDetected && retryCount < maxRetries) {
        console.warn(`Stored filename collision detected: ${finalStoredFilename} (retry ${retryCount + 1}/${maxRetries})`);
        
        // Generate new filename
        const ext = path.extname(req.file.originalname);
        const newFilename = `${randomUUID()}${ext}`;
        const newFilePath = path.join(UPLOAD_DIR, newFilename);
        
        // Rename the file
        try {
          await fs.rename(finalFilePath, newFilePath);
          finalStoredFilename = newFilename;
          finalFilePath = newFilePath;
          collisionDetected = await checkStoredFilenameExists(finalStoredFilename);
          retryCount++;
        } catch (renameError) {
          // If rename fails, delete the file and return error
          await fs.unlink(finalFilePath);
          res.status(500).json({
            error: {
              message: 'Failed to resolve filename collision. Please try uploading again.',
              type: 'InternalError',
              statusCode: 500,
            },
          });
          return;
        }
      }

      if (collisionDetected) {
        // Still have collision after retries - delete file and return error
        await fs.unlink(finalFilePath);
        res.status(409).json({
          error: {
            message: 'Unable to generate unique filename after multiple attempts. Please try uploading again.',
            type: 'ConflictError',
            statusCode: 409,
          },
        });
        return;
      }

      // CRITICAL: Verify file on disk exists (safety check)
      const fileExistsOnDisk = await checkFileExistsOnDisk(finalFilePath);
      if (!fileExistsOnDisk) {
        res.status(500).json({
          error: {
            message: 'File upload failed: file was not saved to disk',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      const documentType = req.body.document_type || 'vaccine_report';

      // Save attachment record to database with verified unique filename
      const result = await query<ChildAttachmentRow>(
        `INSERT INTO child_attachments 
         (child_id, document_type, original_filename, stored_filename, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          childId,
          documentType,
          req.file.originalname,
          finalStoredFilename, // Use verified unique filename
          req.file.mimetype,
          req.file.size,
        ]
      );

      // CRITICAL: Verify the file still exists after database insert
      const fileStillExists = await checkFileExistsOnDisk(finalFilePath);
      if (!fileStillExists) {
        // Rollback: delete database record if file disappeared
        await query('DELETE FROM child_attachments WHERE id = $1', [result.rows[0].id]);
        res.status(500).json({
          error: {
            message: 'File verification failed: file was lost after database insert',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // CRITICAL: Verify the database record matches what we inserted
      if (result.rows[0].stored_filename !== finalStoredFilename) {
        // Database record doesn't match - rollback
        await query('DELETE FROM child_attachments WHERE id = $1', [result.rows[0].id]);
        await fs.unlink(finalFilePath);
        res.status(500).json({
          error: {
            message: 'File verification failed: database record mismatch',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      // CRITICAL: Verify no other record has this filename
      const isUnique = await verifyStoredFilenameUniqueAfterInsert(
        finalStoredFilename,
        result.rows[0].id,
        'child'
      );
      if (!isUnique) {
        // Another record has this filename - rollback
        await query('DELETE FROM child_attachments WHERE id = $1', [result.rows[0].id]);
        await fs.unlink(finalFilePath);
        res.status(500).json({
          error: {
            message: 'File verification failed: filename conflict detected after insert',
            type: 'InternalError',
            statusCode: 500,
          },
        });
        return;
      }

      const attachment = {
        id: result.rows[0].id,
        child_id: result.rows[0].child_id,
        document_type: result.rows[0].document_type,
        original_filename: result.rows[0].original_filename,
        stored_filename: result.rows[0].stored_filename,
        file_type: result.rows[0].file_type,
        file_size: result.rows[0].file_size,
        created_at: result.rows[0].created_at.toISOString(),
        updated_at: result.rows[0].created_at.toISOString(), // child_attachments doesn't have updated_at, use created_at
      };

      res.status(201).json(createResponse(attachment));
    } catch (error) {
      next(error);
    }
  }
);

// Get all attachments for a child
router.get(
  '/children/:childId/attachments',
  async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const result = await query<ChildAttachmentRow>(
        `SELECT * FROM child_attachments 
         WHERE child_id = $1 
         ORDER BY created_at DESC`,
        [childId]
      );

      const attachments = result.rows.map((row) => ({
        id: row.id,
        child_id: row.child_id,
        document_type: row.document_type,
        original_filename: row.original_filename,
        stored_filename: row.stored_filename,
        file_type: row.file_type,
        file_size: row.file_size,
        created_at: row.created_at.toISOString(),
        updated_at: row.created_at.toISOString(), // child_attachments doesn't have updated_at, use created_at
      }));

      res.json(createResponse(attachments));
    } catch (error) {
      next(error);
    }
  }
);

// Update child attachment filename
router.put('/attachments/:id', async (req: ExpressRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attachmentId = parseInt(req.params.id);
    const { original_filename } = req.body;

    if (isNaN(attachmentId)) {
      res.status(400).json({
        error: {
          message: 'Invalid attachment ID',
          type: 'ValidationError',
          statusCode: 400,
        },
      });
      return;
    }

    if (!original_filename || typeof original_filename !== 'string' || !original_filename.trim()) {
      res.status(400).json({
        error: {
          message: 'original_filename is required',
          type: 'ValidationError',
          statusCode: 400,
        },
      });
      return;
    }

    // Try child_attachments first
    let result = await query(
      'UPDATE child_attachments SET original_filename = $1 WHERE id = $2 RETURNING id',
      [original_filename.trim(), attachmentId]
    );

    if (result.rows.length === 0) {
      // Try measurement_attachments
      result = await query(
        'UPDATE measurement_attachments SET original_filename = $1 WHERE id = $2 RETURNING id',
        [original_filename.trim(), attachmentId]
      );

      if (result.rows.length === 0) {
        // Try visit_attachments
        result = await query(
          'UPDATE visit_attachments SET original_filename = $1 WHERE id = $2 RETURNING id',
          [original_filename.trim(), attachmentId]
        );
      }
    }

    if (result.rows.length === 0) {
      res.status(404).json({
        error: {
          message: 'Attachment not found',
          type: 'NotFoundError',
          statusCode: 404,
        },
      });
      return;
    }

    res.json(createResponse({ id: attachmentId, original_filename: original_filename.trim() }));
  } catch (error) {
    next(error);
  }
});

// Delete child attachment (update existing delete endpoint to check child_attachments too)
// The existing DELETE /attachments/:id already checks measurement and visit attachments
// We need to update it to also check child_attachments

export default router;
