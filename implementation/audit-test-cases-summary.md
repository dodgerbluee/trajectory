# Change Tracking System - Test Cases Summary

Comprehensive test suite for the audit/change tracking system covering all scenarios.

---

## Test Files Created

| File | Purpose | Test Count |
|------|---------|------------|
| `backend/src/lib/__tests__/field-diff.test.ts` | Unit tests for diff logic | ~25 tests |
| `backend/src/lib/__tests__/audit.test.ts` | Unit tests for audit persistence | ~8 tests |
| `backend/src/routes/__tests__/visits-audit.test.ts` | Integration tests for visits | ~10 tests |
| `backend/src/lib/__tests__/field-diff-markdown.example.md` | Markdown rendering examples | Examples |

---

## Test Categories

### 1. ✅ No-op Updates (No Diff Created)

**Test Cases:**
- Same values (no change)
- Whitespace-only changes (normalized away)
- Excluded keys (id, created_at, updated_at)
- Omitted fields (not in payload)

**Sample Assertion:**
```typescript
expect(diff).toEqual({});
expect(mockRecordAuditEvent).not.toHaveBeenCalled();
```

---

### 2. ✅ Single Field Update

**Test Cases:**
- Date change (`visit_date: '2026-01-15' → '2026-01-16'`)
- Number change (`weight_value: 24.5 → 25`)
- String change (`notes: 'Old' → 'New'`)
- Boolean change (`ordered_glasses: false → true`)

**Sample Assertion:**
```typescript
expect(diff).toEqual({
  visit_date: {
    before: '2026-01-15',
    after: '2026-01-16',
  },
});
expect(Object.keys(diff)).toHaveLength(1);
```

---

### 3. ✅ Multiple Field Update

**Test Cases:**
- 2-3 fields changed simultaneously
- 5+ fields changed (summary truncation)
- Mixed types (date + number + string)

**Sample Assertion:**
```typescript
expect(Object.keys(diff)).toHaveLength(3);
expect(diff.visit_date).toBeDefined();
expect(diff.weight_value).toBeDefined();
expect(diff.notes).toBeDefined();
```

---

### 4. ✅ Partial Form Update

**Test Cases:**
- Form A sends only date fields (`visit_date`, `follow_up_date`)
- Form B sends only text fields (`notes`, `doctor_name`)
- Form C sends only measurement fields (`weight_value`, `height_value`)

**Sample Assertion:**
```typescript
// Form A payload: { visit_date: '2026-01-16' }
// Current has: { visit_date: '2026-01-15', notes: 'Original', doctor_name: 'Dr. Smith' }
expect(Object.keys(diff)).toEqual(['visit_date']);
expect(diff.notes).toBeUndefined(); // Omitted field not tracked
expect(diff.doctor_name).toBeUndefined();
```

---

### 5. ✅ Null → Value and Value → Null

**Test Cases:**
- `null → value` (addition: `doctor_name: null → 'Dr. Smith'`)
- `value → null` (removal: `notes: 'Follow up' → null`)
- `undefined → value` (addition)
- `value → ''` (removal, normalized to null)

**Sample Assertions:**
```typescript
// Addition
expect(diff.doctor_name).toEqual({
  before: null,
  after: 'Dr. Smith',
});

// Removal
expect(diff.notes).toEqual({
  before: 'Follow up in 2 weeks',
  after: null,
});
```

---

### 6. ✅ Markdown Diff Example

**Examples Provided:**
- Single field update (GitLab-style diff)
- Multiple field update
- Addition (null → value)
- Removal (value → null)
- Array change
- Boolean change
- Long text change
- Empty diff

**Location:** `backend/src/lib/__tests__/field-diff-markdown.example.md`

---

## Test Structure

### Unit Tests (`field-diff.test.ts`)

```typescript
describe('buildFieldDiff', () => {
  describe('No-op updates', () => {
    it('returns empty object when no fields changed', () => { ... });
    it('ignores whitespace-only changes', () => { ... });
  });

  describe('Single field update', () => {
    it('detects date change', () => { ... });
    it('detects number change', () => { ... });
  });

  describe('Multiple field update', () => {
    it('detects multiple field changes', () => { ... });
  });

  describe('Partial form update', () => {
    it('only tracks fields present in payload', () => { ... });
  });

  describe('Null → value and value → null', () => {
    it('detects null → value (addition)', () => { ... });
    it('detects value → null (removal)', () => { ... });
  });
});
```

### Integration Tests (`visits-audit.test.ts`)

```typescript
describe('PUT /api/visits/:id - Audit on update', () => {
  describe('No-op updates', () => {
    it('does not create audit event when no fields changed', () => { ... });
  });

  describe('Single field update', () => {
    it('creates audit event for single field change', () => { ... });
  });

  describe('Optimistic locking', () => {
    it('returns 409 Conflict when updated_at mismatch', () => { ... });
  });
});

describe('GET /api/visits/:id/history', () => {
  it('returns paginated history', () => { ... });
  it('returns 401 if user lacks permission', () => { ... });
});
```

---

## Running Tests

```bash
# Install dependencies (one-time)
npm install --save-dev jest @jest/globals ts-jest @types/jest

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

## Expected Test Output

```
 PASS  src/lib/__tests__/field-diff.test.ts
  normalizeForCompare
    ✓ normalizes dates to ISO date string
    ✓ normalizes date strings to YYYY-MM-DD
    ✓ normalizes numeric strings to numbers
    ✓ collapses whitespace in strings
    ✓ treats null/undefined/empty as null
  
  buildFieldDiff
    No-op updates (no diff created)
      ✓ returns empty object when no fields changed
      ✓ ignores whitespace-only changes
      ✓ ignores excluded keys
      ✓ ignores omitted fields
    
    Single field update
      ✓ detects date change
      ✓ detects number change
      ✓ detects string change
      ✓ detects boolean change
    
    Multiple field update
      ✓ detects multiple field changes
      ✓ only includes fields present in payload
    
    Partial form update
      ✓ handles partial update from form A
      ✓ handles partial update from form B
    
    Null → value and value → null
      ✓ detects null → value (addition)
      ✓ detects value → null (removal)
      ✓ detects undefined → value (addition)
      ✓ detects value → empty string (removal)
    
    Array changes
      ✓ detects array changes
      ✓ detects array → null

 PASS  src/lib/__tests__/audit.test.ts
  recordAuditEvent
    ✓ persists audit event with all fields
    ✓ truncates very long string values
  
  canViewAuditHistory
    ✓ returns false for unauthenticated user
    ✓ returns false if entity does not exist
    ✓ returns true if entity exists and user is authenticated

Test Suites: 2 passed, 2 total
Tests:       25+ passed, 25+ total
```

---

## Coverage Goals

- **Unit tests:** 90%+ coverage for `field-diff.ts` and `audit.ts`
- **Integration tests:** Cover all audit endpoints
- **Edge cases:** Whitespace, nulls, arrays, long strings, concurrent edits

---

## Next Steps

1. **Install Jest dependencies:**
   ```bash
   npm install --save-dev jest @jest/globals ts-jest @types/jest
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Add to CI/CD:** Include test step in GitHub Actions workflow

4. **Expand coverage:** Add more edge cases as needed (nested objects, special characters, etc.)

---

## Files Created

- ✅ `backend/src/lib/__tests__/field-diff.test.ts` - Diff logic unit tests
- ✅ `backend/src/lib/__tests__/audit.test.ts` - Audit persistence unit tests
- ✅ `backend/src/routes/__tests__/visits-audit.test.ts` - Integration tests
- ✅ `backend/src/lib/__tests__/field-diff-markdown.example.md` - Markdown examples
- ✅ `backend/jest.config.js` - Jest configuration
- ✅ `backend/TESTING.md` - Testing guide
- ✅ `backend/package.json` - Updated with test scripts and dependencies
