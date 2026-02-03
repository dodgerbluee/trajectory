/**
 * Admin routes: config (log level), logs. Instance admin only.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireInstanceAdmin, type AuthRequest } from '../middleware/auth.js';
import { getAdminConfig, updateAdminConfig, type LogLevelValue } from '../lib/admin-config.js';
import { setInstanceSetting } from '../lib/instance-settings.js';
import { getLogBuffer, LogLevel } from '../middleware/error-logger.js';
import { createResponse } from '../types/api.js';
import { BadRequestError } from '../middleware/error-handler.js';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireInstanceAdmin);

/**
 * GET /api/admin/config
 * Returns current admin config (log_level).
 */
adminRouter.get('/config', (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(createResponse(getAdminConfig()));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/config
 * Update admin config (log_level). Body: { log_level: 'info' | 'debug' }.
 */
adminRouter.put('/config', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { log_level } = req.body as { log_level?: string };
    if (log_level === undefined) {
      res.json(createResponse(getAdminConfig()));
      return;
    }
    const level = String(log_level).toLowerCase();
    if (level !== 'info' && level !== 'debug') {
      throw new BadRequestError('log_level must be "info" or "debug"');
    }
    await setInstanceSetting('log_level', level);
    const updated = updateAdminConfig({ log_level: level as LogLevelValue });
    res.json(createResponse(updated));
  } catch (error) {
    next(error);
  }
});

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

/**
 * GET /api/admin/logs
 * Query: level[] (info, debug, warn, error), limit (default 100), offset (default 0).
 */
adminRouter.get('/logs', (req: Request, res: Response, next: NextFunction) => {
  try {
    const levelParam = req.query.level;
    const levels: LogLevel[] = [];
    if (levelParam !== undefined) {
      const arr = Array.isArray(levelParam) ? levelParam : [levelParam];
      for (const v of arr) {
        const s = String(v).toLowerCase();
        if (s in LOG_LEVEL_MAP) {
          levels.push(LOG_LEVEL_MAP[s]);
        }
      }
    }
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || 100), 10) || 100), 500);
    const offset = Math.max(0, parseInt(String(req.query.offset || 0), 10) || 0);
    const { entries, total } = getLogBuffer({
      levels: levels.length > 0 ? levels : undefined,
      limit,
      offset,
    });
    res.json(
      createResponse({
        entries,
        total,
        limit,
        offset,
      })
    );
  } catch (error) {
    next(error);
  }
});
