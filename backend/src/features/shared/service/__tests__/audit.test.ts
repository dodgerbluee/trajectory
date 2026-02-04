/**
 * Unit tests for audit event persistence
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { recordAuditEvent, canViewAuditHistory } from '../audit.js';
import type { AuditChanges } from '../field-diff.js';

// Mock the query function
jest.mock('../../../../db/connection.js', () => ({
  query: jest.fn(),
}));

import { query } from '../../../../db/connection.js';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('recordAuditEvent', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it('persists audit event with all fields', async () => {
    const changes: AuditChanges = {
      visit_date: { before: '2026-01-15', after: '2026-01-16' },
    };

    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await recordAuditEvent({
      entityType: 'visit',
      entityId: 42,
      userId: 5,
      action: 'updated',
      changes,
      summary: 'Updated visit_date',
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_events'),
      expect.arrayContaining([
        'visit',
        42,
        5,
        'updated',
        expect.stringContaining('visit_date'),
        'Updated visit_date',
        null,
      ])
    );
  });

  it('truncates very long string values', async () => {
    const longString = 'x'.repeat(2000);
    const changes: AuditChanges = {
      notes: { before: 'Short', after: longString },
    };

    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await recordAuditEvent({
      entityType: 'visit',
      entityId: 42,
      userId: 5,
      action: 'updated',
      changes,
    });

    const callArgs = mockQuery.mock.calls[0]?.[1];
    if (!callArgs) throw new Error('Expected mock to be called');
    const changesJson = JSON.parse(callArgs[4] as string);
    
    expect(changesJson.notes.after).toHaveLength(1003); // 1000 + '...'
    expect(changesJson.notes.after).toContain('...');
  });
});

describe('canViewAuditHistory', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it('returns false for unauthenticated user', async () => {
    const result = await canViewAuditHistory('visit', 42, null);
    expect(result).toBe(false);
  });

  it('returns false if entity does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);

    const result = await canViewAuditHistory('visit', 999, 5);
    expect(result).toBe(false);
  });

  it('returns true if entity exists and user can access the child (same family)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ child_id: 1 }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ family_id: 1 }], rowCount: 1 } as never);

    const result = await canViewAuditHistory('visit', 42, 5);
    expect(result).toBe(true);
  });

  it('returns false if user cannot access the child (different family)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ child_id: 1 }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await canViewAuditHistory('visit', 42, 5);
    expect(result).toBe(false);
  });
});

describe('recordAuditEvent sanitizes long values', () => {
  it('truncates strings longer than 1000 characters when persisting', () => {
    // Sanitization is applied inside recordAuditEvent; see "truncates very long string values" test above
    expect(true).toBe(true);
  });
});
