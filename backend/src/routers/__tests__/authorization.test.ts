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
import { canAccessPerson, getFamilyIdsForUser, getAccessiblePersonIds, canEditPersonIdentity, canEditFamily } from '../../features/families/service/family-access.js';
import { createApp } from '../../app.js';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCanAccessPerson = canAccessPerson as jest.MockedFunction<typeof canAccessPerson>;
const mockGetFamilyIdsForUser = getFamilyIdsForUser as jest.MockedFunction<typeof getFamilyIdsForUser>;
const mockGetAccessiblePersonIds = getAccessiblePersonIds as jest.MockedFunction<typeof getAccessiblePersonIds>;
const mockCanEditPersonIdentity = canEditPersonIdentity as jest.MockedFunction<typeof canEditPersonIdentity>;
const mockCanEditFamily = canEditFamily as jest.MockedFunction<typeof canEditFamily>;

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

  describe('PUT /api/people/:id — move to another family', () => {
    it('returns 403 when user lacks edit rights in the destination family', async () => {
      mockCanAccessPerson.mockResolvedValue(true);
      mockCanEditPersonIdentity.mockResolvedValue(true);
      mockCanEditFamily.mockResolvedValue(false); // not owner/parent of destination

      await request(app)
        .put('/api/people/1')
        .set('X-Test-User-Id', '1')
        .send({ family_id: 42 })
        .expect(403);

      expect(mockCanEditFamily).toHaveBeenCalledWith(1, 42);
      // Must not have run the UPDATE
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('updates family_id when user can edit both source and destination', async () => {
      mockCanAccessPerson.mockResolvedValue(true);
      mockCanEditPersonIdentity.mockResolvedValue(true);
      mockCanEditFamily.mockResolvedValue(true);
      // 1st query: self-record check (regular person → user_id null)
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: null }] } as never);
      // 2nd query: the UPDATE ... RETURNING
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          family_id: 42,
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
        .put('/api/people/1')
        .set('X-Test-User-Id', '1')
        .send({ family_id: 42 })
        .expect(200);

      expect(mockCanEditFamily).toHaveBeenCalledWith(1, 42);
      const [sql, params] = mockQuery.mock.calls[1];
      expect(sql).toMatch(/UPDATE people/);
      expect(sql).toMatch(/family_id = \$1/);
      expect(params).toEqual([42, 1]);
      expect(res.body.data?.family_id).toBe(42);
    });

    it('refuses to move a self-record (person linked to a user)', async () => {
      mockCanAccessPerson.mockResolvedValue(true);
      mockCanEditPersonIdentity.mockResolvedValue(true);
      mockCanEditFamily.mockResolvedValue(true);
      // self-record check returns a non-null user_id → move is blocked
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 7 }] } as never);

      await request(app)
        .put('/api/people/1')
        .set('X-Test-User-Id', '1')
        .send({ family_id: 42 })
        .expect(400);

      // Only the self-record check ran; no UPDATE
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toMatch(/SELECT user_id FROM people/);
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
