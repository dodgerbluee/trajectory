# Change Tracking System Review & Recommendations

Comprehensive review addressing performance, pagination, permissions, concurrency, and noise reduction.

---

## 1. Performance Concerns for Large Histories

### Current Issues

**Problem:** History endpoints (`GET /api/visits/:id/history`, `GET /api/illnesses/:id/history`) return **all** audit events without pagination. For frequently-edited records, this can:
- Return hundreds/thousands of rows
- Transfer large JSONB `changes` objects
- Slow down queries as the table grows
- Cause frontend rendering lag

**Current Query:**
```sql
SELECT ... FROM audit_events ae
LEFT JOIN users u ON ae.user_id = u.id
WHERE ae.entity_type = 'visit' AND ae.entity_id = $1
ORDER BY ae.changed_at DESC
-- No LIMIT!
```

### Recommendations

#### 1.1 Add Pagination to History Endpoints

**Implementation:**

```typescript
// backend/src/routes/visits.ts
router.get('/:id/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    // Parse pagination params (default: page=1, limit=50, max=200)
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM audit_events
       WHERE entity_type = 'visit' AND entity_id = $1`,
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await query<{...}>(
      `SELECT 
        ae.id, ae.entity_type, ae.entity_id, ae.user_id, ae.action,
        ae.changed_at, ae.changes, ae.summary,
        u.name as user_name, u.email as user_email
       FROM audit_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.entity_type = 'visit' AND ae.entity_id = $1
       ORDER BY ae.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const data: AuditHistoryEvent[] = result.rows.map(row => ({...}));

    res.json(createPaginatedResponse(data, total, { page, limit, offset }));
  } catch (error) {
    next(error);
  }
});
```

**Benefits:**
- Limits response size (default 50, max 200)
- Provides pagination metadata (`hasNextPage`, `totalPages`)
- Uses existing index (`idx_audit_events_entity`) efficiently

#### 1.2 Optimize JSONB Storage

**Problem:** Large `changes` objects (e.g., arrays of prescriptions) increase storage and transfer size.

**Mitigation:** Consider compressing or limiting stored data:

```typescript
// backend/src/lib/audit.ts
export async function recordAuditEvent(params: RecordAuditEventParams): Promise<void> {
  const { entityType, entityId, userId, action, changes, requestId } = params;
  const summary = params.summary ?? auditChangesSummary(changes);

  // Limit individual change value size (e.g., truncate long strings)
  const sanitizedChanges = sanitizeChanges(changes);

  await query(
    `INSERT INTO audit_events (entity_type, entity_id, user_id, action, changes, summary, request_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
    [entityType, entityId, userId, action, JSON.stringify(sanitizedChanges), summary, requestId ?? null]
  );
}

function sanitizeChanges(changes: AuditChanges): AuditChanges {
  const MAX_VALUE_LENGTH = 1000; // Truncate very long values
  const sanitized: AuditChanges = {};
  for (const [key, { before, after }] of Object.entries(changes)) {
    sanitized[key] = {
      before: truncateValue(before, MAX_VALUE_LENGTH),
      after: truncateValue(after, MAX_VALUE_LENGTH),
    };
  }
  return sanitized;
}

function truncateValue(value: unknown, maxLength: number): unknown {
  if (typeof value === 'string' && value.length > maxLength) {
    return value.substring(0, maxLength) + '...';
  }
  return value;
}
```

#### 1.3 Database Partitioning (Long-term)

For very large tables, consider partitioning by `changed_at`:

```sql
-- Partition by year (example)
CREATE TABLE audit_events_2026 PARTITION OF audit_events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

## 2. Pagination Strategies

### 2.1 Cursor-Based Pagination (Alternative)

For better performance on very large datasets, use cursor-based pagination:

```typescript
// Query by changed_at cursor instead of OFFSET
router.get('/:id/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  const cursor = req.query.cursor as string | undefined; // ISO timestamp
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

  const query = cursor
    ? `SELECT ... WHERE entity_type = 'visit' AND entity_id = $1 
       AND changed_at < $2 ORDER BY changed_at DESC LIMIT $3`
    : `SELECT ... WHERE entity_type = 'visit' AND entity_id = $1 
       ORDER BY changed_at DESC LIMIT $2`;

  const params = cursor ? [id, cursor, limit] : [id, limit];
  // ...
});
```

**Benefits:**
- More efficient than OFFSET (no need to skip rows)
- Consistent results even if new events are added during pagination

**Tradeoff:** Requires frontend to track cursors instead of page numbers.

### 2.2 Recommended: Offset-Based (Current)

Keep offset-based pagination for simplicity, but add limits and metadata.

---

## 3. Permissions (Who Can See What)

### Current State

**Problem:** No permission checks on history endpoints. Any authenticated user can view audit history for any visit/illness, even if they don't have access to the record itself.

### Recommendations

#### 3.1 Add Entity Access Checks

**Implementation:**

```typescript
// backend/src/lib/audit.ts
/**
 * Check if user has permission to view audit history for an entity.
 * Users can only view history for entities they can access (e.g., visits/illnesses
 * for children in their family).
 */
export async function canViewAuditHistory(
  entityType: AuditEntityType,
  entityId: number,
  userId: number | null
): Promise<boolean> {
  if (!userId) return false; // Unauthenticated users cannot view history

  if (entityType === 'visit') {
    // Check if user has access to the visit's child
    const result = await query<{ child_id: number }>(
      `SELECT child_id FROM visits WHERE id = $1`,
      [entityId]
    );
    if (result.rows.length === 0) return false;
    
    // TODO: Add family/child access check here
    // For now, assume all authenticated users can access (single-family app)
    // In multi-family app, check: user's family_id matches child's family_id
    return true;
  }

  if (entityType === 'illness') {
    const result = await query<{ child_id: number }>(
      `SELECT child_id FROM illnesses WHERE id = $1`,
      [entityId]
    );
    if (result.rows.length === 0) return false;
    // Same access check as visits
    return true;
  }

  return false;
}
```

**Update history endpoints:**

```typescript
// backend/src/routes/visits.ts
router.get('/:id/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    // Check permissions
    if (!await canViewAuditHistory('visit', id, req.userId ?? null)) {
      throw new UnauthorizedError('You do not have permission to view this history');
    }

    // ... rest of handler
  } catch (error) {
    next(error);
  }
});
```

#### 3.2 Redact Sensitive Fields (Optional)

For compliance (HIPAA, GDPR), consider redacting sensitive fields in audit history:

```typescript
// backend/src/lib/audit.ts
const SENSITIVE_FIELDS = new Set(['notes', 'symptoms', 'treatment']); // Configurable

export function redactSensitiveChanges(
  changes: AuditChanges,
  userRole?: string
): AuditChanges {
  // Admin users see all; regular users see redacted sensitive fields
  if (userRole === 'admin') return changes;

  const redacted: AuditChanges = {};
  for (const [key, value] of Object.entries(changes)) {
    if (SENSITIVE_FIELDS.has(key)) {
      redacted[key] = {
        before: value.before !== null ? '[REDACTED]' : null,
        after: value.after !== null ? '[REDACTED]' : null,
      };
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
```

---

## 4. Handling Concurrent Edits

### Current State

**Problem:** No optimistic locking or conflict detection. Last-write-wins can cause:
- Lost updates (User A's changes overwritten by User B)
- Confusing audit history (shows changes from stale state)

### Recommendations

#### 4.1 Add Optimistic Locking

**Implementation:**

```typescript
// backend/src/routes/visits.ts
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    
    // Load current visit with updated_at for optimistic locking
    const currentResult = await query<VisitRow & { updated_at: Date }>(
      'SELECT *, updated_at FROM visits WHERE id = $1',
      [id]
    );
    if (currentResult.rows.length === 0) {
      throw new NotFoundError('Visit');
    }
    const currentRow = currentResult.rows[0];
    const currentVisit = convertVisitRow(currentRow);

    // Client sends updated_at in request (from last fetch)
    const clientUpdatedAt = req.body.updated_at;
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      const serverTime = currentRow.updated_at;
      
      // Check for conflicts (client's version is stale)
      if (clientTime.getTime() !== serverTime.getTime()) {
        throw new ConflictError(
          'Visit was modified by another user. Please refresh and try again.',
          { 
            currentVersion: serverTime.toISOString(),
            yourVersion: clientUpdatedAt 
          }
        );
      }
    }

    // Build updates (include updated_at = NOW() in UPDATE)
    // ... existing update logic ...

    // UPDATE with optimistic lock check
    const updateResult = await query<VisitRow>(
      `UPDATE visits
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount} AND updated_at = $${paramCount + 1}
       RETURNING *`,
      [...values, id, currentRow.updated_at]
    );

    if (updateResult.rows.length === 0) {
      // No rows updated = conflict detected
      throw new ConflictError(
        'Visit was modified by another user. Please refresh and try again.'
      );
    }

    // ... rest of handler (audit, response)
  } catch (error) {
    next(error);
  }
});
```

**Add ConflictError:**

```typescript
// backend/src/middleware/error-handler.ts
export class ConflictError extends Error {
  statusCode = 409;
  type = 'ConflictError';
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
  }
}
```

**Frontend:** Send `updated_at` from last fetch, handle 409 by refreshing and showing a message.

#### 4.2 Record Conflict in Audit (Optional)

When a conflict is detected but resolved (e.g., merge), record it:

```typescript
// After successful update despite conflict
if (conflictDetected) {
  await recordAuditEvent({
    entityType: 'visit',
    entityId: id,
    userId: req.userId ?? null,
    action: 'updated',
    changes: {}, // Empty changes, conflict resolved
    summary: 'Updated (resolved concurrent edit conflict)',
  });
}
```

---

## 5. Preventing Noisy Diffs

### Current Issues

**Problem:** Normalization already handles some cases (trimming strings, date formats), but:
- Whitespace-only changes in multi-line text still create diffs
- Array reordering (same items, different order) creates false diffs
- Object key order changes create false diffs (already handled via sorted keys)

### Recommendations

#### 5.1 Enhanced String Normalization

**Implementation:**

```typescript
// backend/src/lib/field-diff.ts
export function normalizeForCompare(value: unknown): unknown {
  // ... existing code ...

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Normalize whitespace: collapse multiple spaces/newlines to single space
    const normalized = trimmed.replace(/\s+/g, ' ');
    
    // Normalize date-like strings
    if (DATE_ONLY_REGEX.test(normalized)) return normalized;
    const asDate = new Date(normalized);
    if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().split('T')[0];
    
    // Try to parse as number
    const n = parseFloat(normalized);
    if (!Number.isNaN(n) && String(n) === normalized) return n;
    
    return normalized;
  }

  // ... rest of function
}
```

**Benefits:**
- `"  hello  world  "` and `"hello world"` compare equal
- `"line1\n\nline2"` and `"line1 line2"` compare equal

#### 5.2 Array Normalization (Sort for Comparison)

**Implementation:**

```typescript
// backend/src/lib/field-diff.ts
if (Array.isArray(value)) {
  // Normalize each element
  const normalized = value.map(normalizeForCompare);
  
  // Sort arrays for comparison (same items, different order = equal)
  // But only if all elements are primitives or simple objects
  const canSort = normalized.every(v => 
    typeof v === 'string' || 
    typeof v === 'number' || 
    typeof v === 'boolean' ||
    v === null
  );
  
  if (canSort) {
    normalized.sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });
  }
  
  return JSON.stringify(normalized);
}
```

**Benefits:**
- `["flu", "cold"]` and `["cold", "flu"]` compare equal (for illnesses array)

**Tradeoff:** May hide intentional reordering. Consider making this configurable per field.

#### 5.3 Skip Empty Changes

**Already implemented:** `buildFieldDiff` only adds to `changes` if `valuesEqual` returns false. But ensure normalization is applied consistently.

#### 5.4 Field-Specific Normalization (Advanced)

For fields like `notes` (long text), consider more aggressive normalization:

```typescript
// backend/src/lib/field-diff.ts
const FIELD_SPECIFIC_NORMALIZERS: Record<string, (val: unknown) => unknown> = {
  notes: (val) => {
    if (typeof val !== 'string') return val;
    // Normalize: trim, collapse whitespace, remove trailing punctuation differences
    return val.trim().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '');
  },
  // Add more as needed
};

export function normalizeForCompare(value: unknown, fieldName?: string): unknown {
  // Apply field-specific normalizer if available
  if (fieldName && FIELD_SPECIFIC_NORMALIZERS[fieldName]) {
    value = FIELD_SPECIFIC_NORMALIZERS[fieldName](value);
  }
  
  // ... rest of normalization
}
```

---

## Summary of Code Changes Needed

### High Priority

1. **Add pagination to history endpoints** (visits.ts, illnesses.ts)
2. **Add permission checks** (canViewAuditHistory in audit.ts)
3. **Add optimistic locking** (visits.ts PUT, illnesses.ts PUT)

### Medium Priority

4. **Enhance string normalization** (field-diff.ts: collapse whitespace)
5. **Add ConflictError** (error-handler.ts)

### Low Priority (Future)

6. **Array sorting for comparison** (field-diff.ts: sort arrays)
7. **Sanitize large values** (audit.ts: truncate long strings)
8. **Database partitioning** (migration: partition by year)

---

## Testing Recommendations

1. **Performance:** Load test with 10,000+ audit events per entity
2. **Concurrency:** Test two users editing the same record simultaneously
3. **Permissions:** Test history access with different user roles
4. **Noise:** Test with whitespace-only changes, array reordering
