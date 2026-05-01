/**
 * Authorization tests: user A cannot access user B's resources.
 * Mocks db and family-access so tests run without a real database.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';

// Mock before importing app (so routes use mocks)
jest.mock('../../db/connection.js');
jest.mock('../../features/families/service/family-access.js');
jest.mock('../../middleware/auth.js', () => {
  const testAuth = (req: { headers: Record<string, string | undefined>; userId?: number }, _res: unknown, next: () => void) => {
    const id = req.headers['x-test-user-id'];
    (req as { userId?: number }).userId = id ? parseInt(id, 10) : 1;
    next();
  };
  return {
    authenticate: testAuth,
    authenticateHeaderOrQuery: testAuth,
    optionalAuthenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
    requireInstanceAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

import { query } from '../../db/connection.js';
import { canAccessPerson, getFamilyIdsForUser, getAccessiblePersonIds } from '../../features/families/service/family-access.js';
import { createApp } from '../../app.js';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCanAccessPerson = canAccessPerson as jest.MockedFunction<typeof canAccessPerson>;
const mockGetFamilyIdsForUser = getFamilyIdsForUser as jest.MockedFunction<typeof getFamilyIdsForUser>;
const mockGetAccessiblePersonIds = getAccessiblePersonIds as jest.MockedFunction<typeof getAccessiblePersonIds>;

describe('Authorization: user A cannot access user B\'s resources', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
    mockGetFamilyIdsForUser.mockResolvedValue([]);
    mockGetAccessiblePersonIds.mockResolvedValue([]);
  });

  describe('GET /api/people/:id', () => {
    it('returns 404 when user cannot access person', async () => {
      mockCanAccessPerson.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/people/999')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessPerson).toHaveBeenCalledWith(1, 999);
      expect(res.body.error?.message).toMatch(/not found|child/i);
    });

    it('returns 200 when user can access person', async () => {
      mockCanAccessPerson.mockResolvedValue(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          family_id: 1,
          name: 'Test Person',
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
        .get('/api/people/1')
        .set('X-Test-User-Id', '1')
        .expect(200);

      expect(mockCanAccessPerson).toHaveBeenCalledWith(1, 1);
      expect(res.body.data?.name).toBe('Test Person');
    });
  });

  describe('GET /api/visits/:id', () => {
    it('returns 404 when user cannot access visit (person belongs to another family)', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 100, person_id: 999, visit_date: now, visit_type: 'wellness', created_at: now, updated_at: now }],
      } as never);
      mockCanAccessPerson.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/visits/100')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessPerson).toHaveBeenCalledWith(1, 999);
      expect(res.body.error?.message).toMatch(/not found|visit/i);
    });
  });

  describe('GET /api/illnesses/:id', () => {
    it('returns 404 when user cannot access illness (person belongs to another family)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 50, person_id: 999, start_date: new Date(), updated_at: new Date() }],
      } as never);
      mockCanAccessPerson.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/illnesses/50')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessPerson).toHaveBeenCalledWith(1, 999);
      expect(res.body.error?.message).toMatch(/not found|illness/i);
    });
  });

  describe('PUT /api/people/:id', () => {
    it('returns 404 when user cannot access person', async () => {
      mockCanAccessPerson.mockResolvedValue(false);

      await request(app)
        .put('/api/people/999')
        .set('X-Test-User-Id', '1')
        .send({ name: 'Hacked', date_of_birth: '2020-01-01', gender: 'male' })
        .expect(404);

      expect(mockCanAccessPerson).toHaveBeenCalledWith(1, 999);
    });
  });

  describe('DELETE /api/people/:id', () => {
    it('returns 404 when user cannot access person', async () => {
      mockCanAccessPerson.mockResolvedValue(false);

      await request(app)
        .delete('/api/people/999')
        .set('X-Test-User-Id', '1')
        .expect(404);

      expect(mockCanAccessPerson).toHaveBeenCalledWith(1, 999);
    });
  });
});
