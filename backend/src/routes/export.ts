/**
 * Data export: all data for the authenticated user as a ZIP (JSON + HTML + attachment files).
 */

import { Router, Response, NextFunction } from 'express';
import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';

import { query } from '../db/connection.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { getAccessibleChildIds, canExportData } from '../lib/family-access.js';
import { ForbiddenError } from '../middleware/error-handler.js';

const router = Router();
router.use(authenticate);

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const AVATAR_DIR = process.env.AVATAR_DIR || '/app/avatars';

interface ExportRow {
  [key: string]: unknown;
}

/** Attachment row from any attachment table; all have stored_filename on disk. */
type AttachmentWithSource = ExportRow & { stored_filename: string; _source: 'visit' | 'measurement' | 'child' };

/**
 * GET /api/export
 * Returns a ZIP containing: data.json, export.html, and attachment files (attachments/ and avatars/).
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const allowed = await canExportData(userId);
    if (!allowed) {
      throw new ForbiddenError('Only parents and owners can export data. Read-only members cannot export.');
    }
    const childIds = await getAccessibleChildIds(userId);
    if (childIds.length === 0) {
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="trajectory-export-${date}.zip"`);
      const arch = archiver('zip', { zlib: { level: 6 } });
      arch.on('error', (err: Error) => next(err));
      arch.pipe(res);
      arch.append(JSON.stringify({ exported_at: new Date().toISOString(), children: [], visits: [], illnesses: [], measurements: [], medical_events: [], attachments: [] }, null, 2), { name: 'data.json' });
      arch.append('<!DOCTYPE html><html><body><h1>Trajectory export</h1><p>No data.</p></body></html>', { name: 'export.html' });
      await arch.finalize();
      return;
    }

    const [childrenRes, visitsRes, illnessesRes, measurementsRes, eventsRes] = await Promise.all([
      query<ExportRow>('SELECT * FROM children WHERE id = ANY($1::int[]) ORDER BY name', [childIds]),
      query<ExportRow>('SELECT * FROM visits WHERE child_id = ANY($1::int[]) ORDER BY visit_date DESC', [childIds]),
      query<ExportRow>('SELECT * FROM illnesses WHERE child_id = ANY($1::int[]) ORDER BY start_date DESC', [childIds]),
      query<ExportRow>('SELECT * FROM measurements WHERE child_id = ANY($1::int[]) ORDER BY measurement_date DESC', [childIds]),
      query<ExportRow>('SELECT * FROM medical_events WHERE child_id = ANY($1::int[]) ORDER BY start_date DESC', [childIds]),
    ]);

    const visitIds = visitsRes.rows.map((r) => r.id as number);
    const measurementIds = measurementsRes.rows.map((r) => r.id as number);

    const [visitAttachments, measAttachments, childAttachments] = await Promise.all([
      visitIds.length > 0
        ? query<ExportRow>('SELECT * FROM visit_attachments WHERE visit_id = ANY($1::int[])', [visitIds])
        : Promise.resolve({ rows: [] as ExportRow[] }),
      measurementIds.length > 0
        ? query<ExportRow>('SELECT * FROM measurement_attachments WHERE measurement_id = ANY($1::int[])', [measurementIds])
        : Promise.resolve({ rows: [] as ExportRow[] }),
      query<ExportRow>('SELECT * FROM child_attachments WHERE child_id = ANY($1::int[])', [childIds]),
    ]);

    const attachments: AttachmentWithSource[] = [
      ...visitAttachments.rows.map((r) => ({ ...r, _source: 'visit' as const })) as AttachmentWithSource[],
      ...measAttachments.rows.map((r) => ({ ...r, _source: 'measurement' as const })) as AttachmentWithSource[],
      ...childAttachments.rows.map((r) => ({ ...r, _source: 'child' as const })) as AttachmentWithSource[],
    ];

    const data = {
      exported_at: new Date().toISOString(),
      children: childrenRes.rows,
      visits: visitsRes.rows,
      illnesses: illnessesRes.rows,
      measurements: measurementsRes.rows,
      medical_events: eventsRes.rows,
      attachments: attachments.map(({ _source, ...r }) => r),
    };

    const html = buildExportHtml(data);

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="trajectory-export-${date}.zip"`);

    const arch = archiver('zip', { zlib: { level: 6 } });
    arch.on('error', (err: Error) => next(err));
    arch.pipe(res);

    arch.append(JSON.stringify(data, null, 2), { name: 'data.json' });
    arch.append(html, { name: 'export.html' });

    for (const att of attachments) {
      const stored = att.stored_filename;
      const dir = UPLOAD_DIR;
      try {
        const fullPath = path.join(dir, stored);
        await fs.access(fullPath);
        arch.file(fullPath, { name: `attachments/${stored}` });
      } catch {
        // File missing on disk; skip
      }
    }

    for (const child of childrenRes.rows) {
      const avatar = child.avatar as string | null;
      if (avatar) {
        try {
          const fullPath = path.join(AVATAR_DIR, avatar);
          await fs.access(fullPath);
          arch.file(fullPath, { name: `avatars/${avatar}` });
        } catch {
          // Skip missing avatar
        }
      }
    }

    await arch.finalize();
  } catch (error) {
    next(error);
  }
});

function buildExportHtml(data: { children: ExportRow[]; visits: ExportRow[]; illnesses: ExportRow[]; exported_at: string }): string {
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rows = (arr: ExportRow[], keys: string[]) =>
    arr.map((r) => '<tr>' + keys.map((k) => `<td>${esc(r[k])}</td>`).join('') + '</tr>').join('');

  let body = `<h1>Trajectory export</h1><p>Exported at ${esc(data.exported_at)}</p>`;
  body += `<h2>Children (${data.children.length})</h2><table border="1"><tr><th>id</th><th>name</th><th>date_of_birth</th><th>gender</th></tr>`;
  body += rows(data.children, ['id', 'name', 'date_of_birth', 'gender']);
  body += '</table>';
  body += `<h2>Visits (${data.visits.length})</h2><table border="1"><tr><th>id</th><th>child_id</th><th>visit_date</th><th>visit_type</th><th>notes</th></tr>`;
  body += rows(data.visits, ['id', 'child_id', 'visit_date', 'visit_type', 'notes']);
  body += '</table>';
  body += `<h2>Illnesses (${data.illnesses.length})</h2><table border="1"><tr><th>id</th><th>child_id</th><th>illness_type</th><th>start_date</th><th>notes</th></tr>`;
  body += rows(data.illnesses, ['id', 'child_id', 'illness_type', 'start_date', 'notes']);
  body += '</table>';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Trajectory export</title></head><body>${body}</body></html>`;
}

export default router;
