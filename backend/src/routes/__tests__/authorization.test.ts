/**
 * Authorization tests: user A cannot access user B's resources.
 * Mocks db and family-access so tests run without a real database.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';

// Mock before importing app (so routes use mocks)
jest.mock('../../db/connection.js');
jest.mock('../../lib/family-access.js');
jest.mock('../../middleware/auth.js', () => {
  const testAuth = (req: { headers: Record<string, string | undefined>; userId?: number }, _res: unknown, next: () => void) => {
    const id = req.headers['x-test-user-id'];
    (req as { userId?: number }).userId = id ? parseInt(id, 10) : 1;
    next();
  };
  return {
    authenticate: testAuth,
    optionalAuthenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
    requireInstanceAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

import { query } from '../../db/connection.js';
import { canAccessChild, getFamilyIdsForUser, getAccessibleChildIds } from '../../lib/family-access.js';
import { createApp } from '../../app.js';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCanAccessChild = canAccessChild as jest.MockedFunction<typeof canAccessChild>;
const mockGetFamilyIdsForUser = getFamilyIdsForUser as jest.MockedFunction<typeof getFamilyIdsForUser>;
const mockGetAccessibleChildIds = getAccessibleChildIds as jest.MockedFunction<typeof getAccessibleChildIds>;

describe('Authorization: user A cannot access user B\'s resources', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
    mockGetFamilyIdsForUser.mockResolvedValue([]);
    mockGetAccessibleChildIds.mockResolvedValue([]);
  });

  describe('GET /api/children/:id', () => {
    it('returns 404 when user cannot access child', async () => {
      mockCanAccessChild.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/children/999')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessChild).toHaveBeenCalledWith(1, 999);
      expect(res.body.error?.message).toMatch(/not found|child/i);
    });

    it('returns 200 when user can access child', async () => {
      mockCanAccessChild.mockResolvedValue(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          family_id: 1,
          name: 'Test Child',
          date_of_birth: new Date('2020-01-01'),
          gender: 'male',
          avatar: null,
          notes: null,
          due_date: null,
          birth_weight: null,
          birth_weight_ounces: null,
          birth_height: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      } as never);

      const res = await request(app)
        .get('/api/children/1')
        .set('X-Test-User-Id', '1')
        .expect(200);

      expect(mockCanAccessChild).toHaveBeenCalledWith(1, 1);
      expect(res.body.data?.name).toBe('Test Child');
    });
  });

  describe('GET /api/visits/:id', () => {
    it('returns 404 when user cannot access visit (child belongs to another family)', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 100, child_id: 999, visit_date: now, visit_type: 'wellness', created_at: now, updated_at: now }],
      } as never);
      mockCanAccessChild.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/visits/100')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessChild).toHaveBeenCalledWith(1, 999);
      expect(res.body.error?.message).toMatch(/not found|visit/i);
    });
  });

  describe('GET /api/illnesses/:id', () => {
    it('returns 404 when user cannot access illness (child belongs to another family)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 50, child_id: 999, start_date: new Date(), updated_at: new Date() }],
      } as never);
      mockCanAccessChild.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/illnesses/50')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessChild).toHaveBeenCalledWith(1, 999);
      expect(res.body.error?.message).toMatch(/not found|illness/i);
    });
  });

  describe('PUT /api/children/:id', () => {
    it('returns 404 when user cannot access child', async () => {
      mockCanAccessChild.mockResolvedValue(false);

      await request(app)
        .put('/api/children/999')
        .set('X-Test-User-Id', '1')
        .send({ name: 'Hacked', date_of_birth: '2020-01-01', gender: 'male' })
        .expect(404);

      expect(mockCanAccessChild).toHaveBeenCalledWith(1, 999);
    });
  });

  describe('DELETE /api/children/:id', () => {
    it('returns 404 when user cannot access child', async () => {
      mockCanAccessChild.mockResolvedValue(false);

      await request(app)
        .delete('/api/children/999')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessChild).toHaveBeenCalledWith(1, 999);
    });
  });
});
