/**
 * Unit tests for field-level diff logic
 */

import { describe, it, expect } from '@jest/globals';
import { buildFieldDiff, normalizeForCompare, auditChangesSummary } from '../field-diff.js';
import type { AuditChanges } from '../field-diff.js';

describe('normalizeForCompare', () => {
  it('normalizes dates to ISO date string', () => {
    const date = new Date('2026-01-15T10:30:00Z');
    expect(normalizeForCompare(date)).toBe('2026-01-15');
  });

  it('normalizes date strings to YYYY-MM-DD', () => {
    expect(normalizeForCompare('2026-01-15')).toBe('2026-01-15');
    expect(normalizeForCompare('2026-01-15T00:00:00.000Z')).toBe('2026-01-15');
  });

  it('normalizes numeric strings to numbers', () => {
    expect(normalizeForCompare('24.5')).toBe(24.5);
    expect(normalizeForCompare('100')).toBe(100);
  });

  it('collapses whitespace in strings', () => {
    expect(normalizeForCompare('  hello  world  ')).toBe('hello world');
    expect(normalizeForCompare('line1\n\nline2')).toBe('line1 line2');
    expect(normalizeForCompare('tab\t\tspace')).toBe('tab space');
  });

  it('treats null/undefined/empty as null', () => {
    expect(normalizeForCompare(null)).toBe(null);
    expect(normalizeForCompare(undefined)).toBe(null);
    expect(normalizeForCompare('')).toBe(null);
    expect(normalizeForCompare('   ')).toBe(null);
  });

  it('normalizes arrays to JSON string', () => {
    expect(normalizeForCompare(['a', 'b'])).toBe(JSON.stringify(['a', 'b']));
  });

  it('normalizes objects with sorted keys', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(normalizeForCompare(obj1)).toBe(normalizeForCompare(obj2));
  });

  it('normalizes effectively empty objects to null (suppresses noisy diffs)', () => {
    // Objects with all null/empty nested values should normalize to null
    const emptyVisionRefraction = {
      od: { axis: null, sphere: null, cylinder: null },
      os: { axis: null, sphere: null, cylinder: null },
    };
    expect(normalizeForCompare(emptyVisionRefraction)).toBe(null);
    expect(normalizeForCompare(null)).toBe(null);
    // They should compare equal
    expect(normalizeForCompare(emptyVisionRefraction)).toBe(normalizeForCompare(null));
  });

  it('normalizes effectively empty arrays to null', () => {
    expect(normalizeForCompare([])).toBe(null);
    expect(normalizeForCompare([null, null])).toBe(null);
    expect(normalizeForCompare([{ a: null }, { b: null }])).toBe(null);
  });
});

describe('buildFieldDiff', () => {
  describe('No-op updates (no diff created)', () => {
    it('returns empty object when no fields changed', () => {
      const current = {
        visit_date: '2026-01-15',
        weight_value: 24.5,
        notes: 'Follow up',
      };
      const payload = {
        visit_date: '2026-01-15',
        weight_value: 24.5,
        notes: 'Follow up',
      };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({});
    });

    it('ignores whitespace-only changes', () => {
      const current = { notes: 'Follow up' };
      const payload = { notes: '  Follow up  ' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({});
    });

    it('ignores excluded keys (id, created_at, updated_at)', () => {
      const current = { id: 1, visit_date: '2026-01-15', created_at: '2026-01-01' };
      const payload = { id: 999, visit_date: '2026-01-15', created_at: '2026-01-02' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({});
    });

    it('ignores omitted fields (not in payload)', () => {
      const current = {
        visit_date: '2026-01-15',
        weight_value: 24.5,
        notes: 'Original notes',
      };
      const payload = {
        visit_date: '2026-01-15', // Only visit_date sent, notes omitted
      };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({});
    });
  });

  describe('Single field update', () => {
    it('detects date change', () => {
      const current = { visit_date: '2026-01-15' };
      const payload = { visit_date: '2026-01-16' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        visit_date: {
          before: '2026-01-15',
          after: '2026-01-16',
        },
      });
    });

    it('detects number change', () => {
      const current = { weight_value: 24.5 };
      const payload = { weight_value: 25 };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        weight_value: {
          before: 24.5,
          after: 25,
        },
      });
    });

    it('detects string change', () => {
      const current = { notes: 'Old notes' };
      const payload = { notes: 'New notes' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        notes: {
          before: 'Old notes',
          after: 'New notes',
        },
      });
    });

    it('detects boolean change', () => {
      const current = { ordered_glasses: false };
      const payload = { ordered_glasses: true };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        ordered_glasses: {
          before: false,
          after: true,
        },
      });
    });
  });

  describe('Multiple field update', () => {
    it('detects multiple field changes', () => {
      const current = {
        visit_date: '2026-01-15',
        weight_value: 24.5,
        notes: 'Old notes',
      };
      const payload = {
        visit_date: '2026-01-16',
        weight_value: 25,
        notes: 'New notes',
      };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        visit_date: {
          before: '2026-01-15',
          after: '2026-01-16',
        },
        weight_value: {
          before: 24.5,
          after: 25,
        },
        notes: {
          before: 'Old notes',
          after: 'New notes',
        },
      });
    });

    it('only includes fields present in payload', () => {
      const current = {
        visit_date: '2026-01-15',
        weight_value: 24.5,
        height_value: 30,
        notes: 'Original',
      };
      const payload = {
        visit_date: '2026-01-16',
        weight_value: 25,
        // height_value and notes omitted
      };

      const diff = buildFieldDiff(current, payload);
      expect(Object.keys(diff)).toEqual(['visit_date', 'weight_value']);
      expect(diff.height_value).toBeUndefined();
      expect(diff.notes).toBeUndefined();
    });
  });

  describe('Partial form update', () => {
    it('handles partial update from form A (only date fields)', () => {
      const current = {
        visit_date: '2026-01-15',
        end_date: null,
        notes: 'Original notes',
        doctor_name: 'Dr. Smith',
      };
      const payload = {
        visit_date: '2026-01-16',
        end_date: '2026-02-01',
        // notes and doctor_name not sent (form A only edits dates)
      };

      const diff = buildFieldDiff(current, payload);
      expect(Object.keys(diff)).toEqual(['visit_date', 'end_date']);
      expect(diff.notes).toBeUndefined();
      expect(diff.doctor_name).toBeUndefined();
    });

    it('handles partial update from form B (only text fields)', () => {
      const current = {
        visit_date: '2026-01-15',
        notes: 'Original notes',
        doctor_name: 'Dr. Smith',
      };
      const payload = {
        notes: 'Updated notes',
        doctor_name: 'Dr. Jones',
        // visit_date not sent (form B only edits text)
      };

      const diff = buildFieldDiff(current, payload);
      expect(Object.keys(diff)).toEqual(['notes', 'doctor_name']);
      expect(diff.visit_date).toBeUndefined();
    });
  });

  describe('Null → value and value → null', () => {
    it('detects null → value (addition)', () => {
      const current = { doctor_name: null };
      const payload = { doctor_name: 'Dr. Smith' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        doctor_name: {
          before: null,
          after: 'Dr. Smith',
        },
      });
    });

    it('detects value → null (removal)', () => {
      const current = { notes: 'Follow up in 2 weeks' };
      const payload = { notes: null };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        notes: {
          before: 'Follow up in 2 weeks',
          after: null,
        },
      });
    });

    it('detects undefined → value (addition)', () => {
      const current = { doctor_name: undefined };
      const payload = { doctor_name: 'Dr. Smith' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        doctor_name: {
          before: null, // undefined normalized to null
          after: 'Dr. Smith',
        },
      });
    });

    it('detects value → empty string (removal)', () => {
      const current = { notes: 'Some notes' };
      const payload = { notes: '' };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        notes: {
          before: 'Some notes',
          after: null, // empty string normalized to null
        },
      });
    });
  });

  describe('Array changes', () => {
    it('detects array changes', () => {
      const current = { illnesses: ['flu'] };
      const payload = { illnesses: ['flu', 'cold'] };

      const diff = buildFieldDiff(current, payload);
      expect(diff.illnesses).toBeDefined();
      expect(diff.illnesses?.before).toEqual(['flu']);
      expect(diff.illnesses?.after).toEqual(['flu', 'cold']);
    });

    it('detects array → null', () => {
      const current = { illnesses: ['flu', 'cold'] };
      const payload = { illnesses: null };

      const diff = buildFieldDiff(current, payload);
      expect(diff).toEqual({
        illnesses: {
          before: ['flu', 'cold'],
          after: null,
        },
      });
    });
  });

  describe('Custom excludeKeys', () => {
    it('excludes custom keys', () => {
      const current = { visit_date: '2026-01-15', child_id: 1 };
      const payload = { visit_date: '2026-01-16', child_id: 2 };

      const diff = buildFieldDiff(current, payload, { excludeKeys: ['child_id'] });
      expect(diff.child_id).toBeUndefined();
      expect(diff.visit_date).toBeDefined();
    });
  });

  describe('Effectively empty objects (suppress noisy diffs)', () => {
    it('suppresses diff when effectively empty object vs null', () => {
      const current = { vision_refraction: null };
      const payload = {
        vision_refraction: {
          od: { axis: null, sphere: null, cylinder: null },
          os: { axis: null, sphere: null, cylinder: null },
        },
      };

      const diff = buildFieldDiff(current, payload);
      // Should not create a diff since both normalize to null
      expect(diff.vision_refraction).toBeUndefined();
    });

    it('suppresses diff when null vs effectively empty object', () => {
      const current = {
        vision_refraction: {
          od: { axis: null, sphere: null, cylinder: null },
          os: { axis: null, sphere: null, cylinder: null },
        },
      };
      const payload = { vision_refraction: null };

      const diff = buildFieldDiff(current, payload);
      // Should not create a diff since both normalize to null
      expect(diff.vision_refraction).toBeUndefined();
    });

    it('creates diff when object has actual values', () => {
      const current = { vision_refraction: null };
      const payload = {
        vision_refraction: {
          od: { axis: 90, sphere: -2.0, cylinder: -0.5 },
          os: { axis: null, sphere: null, cylinder: null },
        },
      };

      const diff = buildFieldDiff(current, payload);
      // Should create a diff since payload has actual values
      expect(diff.vision_refraction).toBeDefined();
      expect(diff.vision_refraction?.before).toBe(null);
      expect(diff.vision_refraction?.after).toEqual(payload.vision_refraction);
    });
  });
});

describe('auditChangesSummary', () => {
  it('returns empty string for empty changes', () => {
    expect(auditChangesSummary({})).toBe('');
  });

  it('returns detailed summary when we have change data (entity type does not override)', () => {
    const changes: AuditChanges = {
      visit_date: { before: '2026-01-15', after: '2026-01-16' },
      notes: { before: 'Old', after: 'New' },
    };
    expect(auditChangesSummary(changes, 'visit')).toBe('Updated visit_date, notes');
    expect(auditChangesSummary(changes, 'illness')).toBe('Updated visit_date, notes');
  });

  it('returns detailed summary when entity type not provided (backward compatibility)', () => {
    const changes: AuditChanges = {
      visit_date: { before: '2026-01-15', after: '2026-01-16' },
      notes: { before: 'Old', after: 'New' },
    };
    expect(auditChangesSummary(changes)).toBe('Updated visit_date, notes');
  });

  it('returns truncated summary for many fields when entity type not provided', () => {
    const changes: AuditChanges = {
      visit_date: { before: '2026-01-15', after: '2026-01-16' },
      weight_value: { before: 24.5, after: 25 },
      notes: { before: 'Old', after: 'New' },
      doctor_name: { before: 'Dr. A', after: 'Dr. B' },
      location: { before: 'Clinic A', after: 'Clinic B' },
    };
    const summary = auditChangesSummary(changes);
    expect(summary).toContain('Updated 5 fields');
    expect(summary).toContain('...');
  });

  it('filters out effectively empty changes from summary', () => {
    const changes: AuditChanges = {
      vision_refraction: {
        before: null,
        after: {
          od: { axis: null, sphere: null, cylinder: null },
          os: { axis: null, sphere: null, cylinder: null },
        },
      },
      tags: { before: null, after: null },
      notes: { before: 'Old', after: 'New' },
    };
    // With or without entity type, should filter effectively empty and show only notes
    expect(auditChangesSummary(changes, 'visit')).toBe('Updated notes');
    expect(auditChangesSummary(changes)).toBe('Updated notes');
  });

  it('returns empty string when all changes are effectively empty', () => {
    const changes: AuditChanges = {
      vision_refraction: {
        before: null,
        after: {
          od: { axis: null, sphere: null, cylinder: null },
          os: { axis: null, sphere: null, cylinder: null },
        },
      },
      tags: { before: null, after: null },
    };
    expect(auditChangesSummary(changes)).toBe('');
    expect(auditChangesSummary(changes, 'visit')).toBe('');
  });
});
