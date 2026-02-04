# Testing Guide - Change Tracking System

Test cases for the audit/change tracking system.

---

## Test Structure

Tests are organized into:

1. **Unit Tests** (`src/lib/__tests__/`) - Test individual functions in isolation
   - `field-diff.test.ts` - Diff logic, normalization, summary generation
   - `audit.test.ts` - Audit persistence, permissions, sanitization

2. **Integration Tests** (`src/routes/__tests__/`) - Test full request/response flow
   - `visits-audit.test.ts` - Visit update → audit → history retrieval
   - `illnesses-audit.test.ts` - Illness update → audit → history retrieval

---

## Running Tests

**Prerequisite:** Install all dependencies (including `supertest` for route/authorization tests):

```bash
npm install
```

Then:

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- field-diff.test.ts

# Run in watch mode
npm test -- --watch
```

---

## Test Cases Overview

### 1. No-op Updates (No Diff Created)

No audit events when nothing actually changed.

**Test Cases:**
- ✅ Same values (no change)
- ✅ Whitespace-only changes (normalized away)
- ✅ Excluded keys (id, created_at, updated_at)
- ✅ Omitted fields (not in payload)

**Assertions:**
```typescript
expect(diff).toEqual({});
expect(mockRecordAuditEvent).not.toHaveBeenCalled();
```

---

### 2. Single Field Update

Single field changes are detected and recorded.

**Test Cases:**
- ✅ Date change (`visit_date`)
- ✅ Number change (`weight_value`)
- ✅ String change (`notes`)
- ✅ Boolean change (`ordered_glasses`)

**Assertions:**
```typescript
expect(diff).toEqual({
  fieldName: {
    before: 'oldValue',
    after: 'newValue',
  },
});
expect(Object.keys(diff)).toHaveLength(1);
```

---

### 3. Multiple Field Update

Multiple simultaneous changes are all tracked.

**Test Cases:****
- ✅ 2-3 fields changed
- ✅ 5+ fields changed (summary truncation)
- ✅ Mixed types (date + number + string)

**Assertions:**
```typescript
expect(Object.keys(diff)).toHaveLength(3);
expect(diff.field1).toBeDefined();
expect(diff.field2).toBeDefined();
expect(diff.field3).toBeDefined();
```

---

### 4. Partial Form Update

**Purpose:** Ensure only fields present in payload are tracked (not omitted fields).

**Test Cases:**
- ✅ Form A sends only date fields
- ✅ Form B sends only text fields
- ✅ Form C sends only measurement fields

**Assertions:**
```typescript
expect(Object.keys(diff)).toEqual(['visit_date']); // Only sent fields
expect(diff.notes).toBeUndefined(); // Omitted field not tracked
```

---

### 5. Null → Value and Value → Null

**Purpose:** Verify addition and removal of fields are tracked correctly.

**Test Cases:**
- ✅ `null → value` (addition)
- ✅ `value → null` (removal)
- ✅ `undefined → value` (addition)
- ✅ `value → ''` (removal, normalized to null)

**Assertions:**
```typescript
// Addition
expect(diff.field).toEqual({
  before: null,
  after: 'newValue',
});

// Removal
expect(diff.field).toEqual({
  before: 'oldValue',
  after: null,
});
```

---

### 6. Markdown Diff Example

**Purpose:** Demonstrate how diffs would be rendered in markdown format.

See `src/lib/__tests__/field-diff-markdown.example.md` for:
- GitLab-style diff rendering
- Before/after formatting
- Handling nulls, arrays, booleans
- Long text changes

---

## Sample Test Execution

```bash
$ npm test

 PASS  src/lib/__tests__/field-diff.test.ts
  normalizeForCompare
    ✓ normalizes dates to ISO date string (2 ms)
    ✓ normalizes date strings to YYYY-MM-DD (1 ms)
    ✓ normalizes numeric strings to numbers (1 ms)
    ✓ collapses whitespace in strings (1 ms)
    ✓ treats null/undefined/empty as null (1 ms)
  
  buildFieldDiff
    No-op updates (no diff created)
      ✓ returns empty object when no fields changed (1 ms)
      ✓ ignores whitespace-only changes (1 ms)
      ✓ ignores excluded keys (1 ms)
      ✓ ignores omitted fields (1 ms)
    
    Single field update
      ✓ detects date change (1 ms)
      ✓ detects number change (1 ms)
      ✓ detects string change (1 ms)
      ✓ detects boolean change (1 ms)
    
    Multiple field update
      ✓ detects multiple field changes (1 ms)
      ✓ only includes fields present in payload (1 ms)
    
    Partial form update
      ✓ handles partial update from form A (1 ms)
      ✓ handles partial update from form B (1 ms)
    
    Null → value and value → null
      ✓ detects null → value (addition) (1 ms)
      ✓ detects value → null (removal) (1 ms)
      ✓ detects undefined → value (addition) (1 ms)
      ✓ detects value → empty string (removal) (1 ms)
    
    Array changes
      ✓ detects array changes (1 ms)
      ✓ detects array → null (1 ms)

 PASS  src/lib/__tests__/audit.test.ts
  recordAuditEvent
    ✓ persists audit event with all fields (5 ms)
    ✓ truncates very long string values (2 ms)
  
  canViewAuditHistory
    ✓ returns false for unauthenticated user (1 ms)
    ✓ returns false if entity does not exist (1 ms)
    ✓ returns true if entity exists and user is authenticated (2 ms)

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        1.234 s
```

---

## Integration Test Example

```typescript
describe('PUT /api/visits/:id - Full flow', () => {
  it('creates audit event on successful update', async () => {
    // 1. Mock current visit
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 42, visit_date: new Date('2026-01-15'), ... }],
    });

    // 2. Execute PUT request
    const response = await request(app)
      .put('/api/visits/42')
      .set('Authorization', 'Bearer token')
      .send({ visit_date: '2026-01-16' });

    // 3. Assert update succeeded
    expect(response.status).toBe(200);

    // 4. Assert audit event was created
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'visit',
        entityId: 42,
        action: 'updated',
        changes: {
          visit_date: {
            before: '2026-01-15',
            after: '2026-01-16',
          },
        },
      })
    );

    // 5. Verify history endpoint returns the event
    const historyResponse = await request(app)
      .get('/api/visits/42/history')
      .set('Authorization', 'Bearer token');

    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0].changes.visit_date).toBeDefined();
  });
});
```

---

## Edge Cases to Test

1. **Very long values:** Truncation to 1000 chars
2. **Special characters:** Quotes, newlines, unicode
3. **Nested objects:** JSONB fields (prescriptions, vision_refraction)
4. **Array reordering:** Same items, different order (currently creates diff)
5. **Concurrent edits:** Optimistic locking conflicts
6. **Permission boundaries:** Unauthorized access attempts
7. **Pagination:** Large history lists (100+ events)

---

## Mock Data Examples

```typescript
const mockCurrentVisit = {
  id: 42,
  child_id: 1,
  visit_date: '2026-01-15',
  visit_type: 'wellness',
  weight_value: 24.5,
  height_value: 30,
  notes: 'Follow up in 2 weeks',
  doctor_name: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
};

const mockPayload = {
  visit_date: '2026-01-16',
  weight_value: 25,
  // Other fields omitted (partial update)
};
```

---

## Coverage Goals

- **Unit tests:** 90%+ coverage for `field-diff.ts` and `audit.ts`
- **Integration tests:** Cover all audit endpoints (history, update with audit)
- **Edge cases:** Whitespace, nulls, arrays, long strings, concurrent edits

---

## Continuous Integration

Add to `.github/workflows/`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```
