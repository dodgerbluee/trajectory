# Change Tracking / Audit History for Visit and Illness

Proposal for full field-level change tracking and audit history, database-backed and extensible, with GitLab-style before/after display.

---

## 1. Data Model

### Option A: Single generic audit table (recommended for extensibility)

One table stores all entity changes; entity type and ID identify the record.

```sql
-- Entity type enum for future growth
CREATE TYPE audit_entity_type AS ENUM ('visit', 'illness', 'child', 'measurement' /* extend later */);

CREATE TABLE audit_events (
  id                BIGSERIAL PRIMARY KEY,
  entity_type       audit_entity_type NOT NULL,
  entity_id         INTEGER NOT NULL,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action            VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional: request/session id for grouping or idempotency
  request_id        UUID,
  -- Field-level diff: JSONB, see §4
  changes           JSONB NOT NULL,
  -- Optional: human-readable summary (e.g. "Updated visit_date, weight_value")
  summary           TEXT,
  CONSTRAINT uq_entity UNIQUE (entity_type, entity_id, id)  -- not needed if id is PK; index below
);

CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id, changed_at DESC);
CREATE INDEX idx_audit_events_user   ON audit_events (user_id, changed_at DESC);
CREATE INDEX idx_audit_events_changes ON audit_events USING GIN (changes);
```

- **entity_type** + **entity_id**: which record (e.g. `visit`, 42).
- **action**: `created` | `updated` | `deleted`.
- **changes**: one JSON object per field change; structure in §4.
- **summary**: optional short line for lists (“Updated 3 fields”).

**Extensibility**: New entities (e.g. `child`, `measurement`) reuse the same table; add a new value to `audit_entity_type` and record the same `changes` shape.

### Option B: One table per entity (simpler queries, more migrations)

Keep your existing `visit_history`-style table but add a **changes** column and optionally **user_id**:

```sql
-- Extend existing visit_history
ALTER TABLE visit_history
  ADD COLUMN IF NOT EXISTS changes JSONB,
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- New table for illnesses
CREATE TABLE illness_history (
  id         SERIAL PRIMARY KEY,
  illness_id INTEGER NOT NULL REFERENCES illnesses(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changes    JSONB NOT NULL,
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Recommendation**: Use **Option A** (`audit_events`) so one schema and one code path handle all entities and future ones.

---

## 2. Where Change Detection Should Occur: Backend

**Do all diffing and audit writes on the backend.**

| Aspect | Backend | Frontend |
|--------|--------|----------|
| Source of truth | DB row is the only “before” state. | Form state can be stale or from another tab. |
| Concurrent edits | Backend sees latest row; can enforce optimistic locking. | Two users editing = two different “before” views. |
| Security | Server authorizes and validates; no bypass. | Client can be manipulated. |
| Consistency | One place to normalize types (dates, decimals, JSON). | Duplicated logic and risk of drift. |
| Cross-form | Edit from Visit form vs Illness form: backend still compares DB vs payload. | Hard to coordinate two UIs. |

**Flow**

1. **Update request** (e.g. `PUT /api/visits/:id` or `PATCH /api/illnesses/:id`) hits backend.
2. Backend loads **current row** from DB (or returns 404/409 if deleted or version conflict).
3. Backend applies and validates the payload (existing validation).
4. **Before** committing the UPDATE:
   - Build a **diff** between current row and the **new values** (only fields present in the payload).
   - If diff is non-empty (or action is create/delete), insert one row into `audit_events` (entity_type, entity_id, user_id, action, changes, summary).
5. Commit: UPDATE entity row, then INSERT audit row (or in one transaction with a small helper).

**Concurrent edits**

- **Optimistic locking**: Add `updated_at` (or a version column) to Visit/Illness. On update, `WHERE id = $1 AND updated_at = $2`; if no row updated, return 409 and ask client to refresh. Still write an audit row only when the update actually succeeds.
- **Last-write-wins**: Current approach; audit still records “what changed from previous DB state to this write.” No conflict detection.

---

## 3. Capturing Diffs Generically for All Fields

Use a **single generic diff routine** that works for any entity:

- **Input**: (1) current record as a plain object (from DB, normalized to API shape), (2) incoming payload (only fields sent in the request).
- **Output**: list of `{ field, before, after, change_type }` (see §4).

**Rules**

1. **Only fields present in the payload** are considered. Omitted fields are “unchanged” for this request.
2. **Normalize** before compare:
   - Dates: compare as ISO date strings (or same timezone).
   - Decimals: compare as numbers (parse DB strings to number).
   - JSON/JSONB: compare after normalizing (e.g. sorted keys, or canonical JSON string).
   - Arrays (e.g. `illnesses`, `vaccines_administered`): treat as “value” (see below) or use a small list-diff (added/removed) for richer display.
3. **Null / empty**:
   - `null` → `""` or `null` → `"something"` = **changed**.
   - Omitted in payload = do not add to diff.

**Pseudocode (backend)**

```ts
type ChangeType = 'added' | 'changed' | 'removed';

function buildFieldDiff<T extends Record<string, unknown>>(
  current: T,
  payload: Partial<T>,
  options?: { excludeKeys?: string[] }
): Array<{ field: string; before: unknown; after: unknown; change_type: ChangeType }> {
  const diff: Array<...> = [];
  const exclude = new Set(options?.excludeKeys ?? ['created_at', 'updated_at']);
  for (const [key, afterVal] of Object.entries(payload)) {
    if (exclude.has(key)) continue;
    const beforeVal = current[key];
    const nBefore = normalizeForCompare(beforeVal);
    const nAfter  = normalizeForCompare(afterVal);
    if (nBefore === nAfter) continue; // or use deep equality for objects
    diff.push({
      field: key,
      before: beforeVal,
      after: afterVal,
      change_type: beforeVal === undefined ? 'added' : (afterVal === undefined || afterVal === null && beforeVal != null) ? 'removed' : 'changed',
    });
  }
  return diff;
}
```

Use **per-entity field lists** (e.g. `VISIT_AUDIT_FIELDS`, `ILLNESS_AUDIT_FIELDS`) so you only diff allowed columns and avoid leaking internal keys. For **created**, “before” is absent (or null); for **deleted**, “after” is absent.

**Join / child data (e.g. visit illnesses)**

- Option 1: Treat `illnesses` as one field: store before/after as arrays (or JSON); UI can show “illnesses: [a,b] → [a,c]” or a small list diff.
- Option 2: Separate audit rows for the join table (e.g. “visit_illnesses” as an entity type or a child table). More normalized, more complex. Recommendation: start with Option 1 (single “illnesses” field in the visit diff).

---

## 4. Recommended Diff Format (JSON) for Storage

Store in `audit_events.changes` a **single JSON object** that is easy to query and render:

```json
{
  "visit_date":    { "before": "2024-01-15", "after": "2024-01-16" },
  "weight_value":  { "before": 24.5, "after": 25 },
  "illnesses":     { "before": ["flu"], "after": ["flu", "ear_infection"] },
  "notes":         { "before": "Follow up in 2 weeks", "after": null }
}
```

- **Key** = field name (API/public name).
- **Value** = `{ "before": <value>, "after": <value> }`.
  - For **created**: omit `"before"` or use `null`.
  - For **deleted**: omit `"after"` or use `null`.
- Use **scalar or JSON-serializable values** (numbers, strings, null, arrays, plain objects). Same normalization as in §3 (dates as ISO strings, decimals as numbers).

**Alternatives**

- **Array of changes**: `[{ "field": "visit_date", "before": "...", "after": "..." }, ...]`. Slightly easier to iterate in code; slightly harder to index by field in SQL (still doable with GIN on JSONB).
- **Git-style patch**: overkill and harder to query; not recommended.

**Recommendation**: Object keyed by field (as above) for simple GIN indexing and straightforward UI mapping (field → before/after).

---

## 5. Rendering Before/After Diffs in the UI (GitLab-style)

**Goal**: Show “before → after” per field, with optional strikethrough for removed and highlight for added.

**Data**

- Load audit for the entity: e.g. `GET /api/visits/:id/history` or `GET /api/illnesses/:id/history` returning `{ data: AuditEvent[] }`.
- Each event: `{ id, user_id, action, changed_at, changes, summary }`, with `changes` as the JSON object above.

**Per-field rendering**

- **Scalar (string, number, date, null)**  
  - One line: `Visit date: 2024-01-15 → 2024-01-16`  
  - Or: `Visit date: <del>2024-01-15</del> <ins>2024-01-16</ins>` (CSS: `.audit-del`, `.audit-ins`).
- **List (e.g. illnesses)**  
  - “Illnesses: flu → flu, ear_infection” or list removed (red) / added (green).
- **Long text (e.g. notes)**  
  - Collapse to one line in list view; expand or modal to show full before/after side-by-side or inline diff.

**Structure**

- **History list**: Reverse chronological; each row = one audit event (date, user, summary or “X fields changed”).
- **Expand row** (or click): show the diff block for that event:
  - For each key in `changes`, resolve a **label** (e.g. `visit_date` → “Visit date”) from a map or i18n.
  - Render `before` and `after` with the same rules (scalar vs list vs long text).

**Formatting helpers**

- Dates: use app’s `formatDate()`.
- Null/empty: show “—”, “(empty)”, or “(removed)”.
- Decimals: fixed precision for measurements (e.g. 1 decimal).

**Component**

- Reusable `AuditDiffView` component:
  - Props: `changes` (the JSON object), `fieldLabels?: Record<string, string>`, `formatValue?: (field, value) => string`.
  - Renders a list of lines; each line = label + before → after (or del/ins).

---

## 6. Tradeoffs and Alternatives

| Approach | Pros | Cons |
|----------|------|------|
| **Backend-only diff (recommended)** | Single source of truth; works with any client; handles concurrency; secure. | Slightly more logic and one extra read (current row) per update. |
| Frontend sends “diff” in request | Less backend logic. | Trust/security; two UIs can send inconsistent diffs; no single source of truth. |
| **Single audit table (Option A)** | One schema; one code path; easy to add entities; cross-entity queries. | Slightly more generic code; entity_type + entity_id in every query. |
| One table per entity (Option B) | Simple per-entity queries; reuses existing visit_history. | More migrations and duplicate logic for each entity. |
| **Object diff in JSONB** | Simple, queryable (GIN), flexible. | Slightly more storage than minimal “only changed fields” array. |
| Array of {field, before, after} | Easy to iterate. | A bit less convenient for “give me all changes for field X” in SQL. |
| Event sourcing (store every version) | Full history; replay. | Much larger storage; complexity; likely overkill for “show who changed what.” |

**Alternatives considered**

- **CQRS / event store**: Overkill unless you need replay and temporal queries.
- **Triggers in DB**: Can append to audit table on UPDATE; harder to get “current user” and to normalize types in one place with app code; less flexible for summary/labels.
- **Frontend-only history**: Not authoritative; doesn’t work across devices/forms; easy to bypass.

---

## 7. Production and Concurrency Notes

- **Who**: Store `user_id` (from auth) on every audit row; support “system” or null for migrations/backfills.
- **When**: Use `changed_at TIMESTAMPTZ DEFAULT NOW()`; use server time only.
- **Idempotency**: Optional `request_id` (UUID) per request; unique index on (entity_type, entity_id, request_id) if you want to dedupe retries.
- **Concurrent edits**: Prefer optimistic locking (version/updated_at) so audit only writes when update succeeds; avoid double-counting or confusing history.
- **Retention**: Policy (e.g. keep audit_events for 7 years); partition by `changed_at` if the table grows large.
- **Performance**: Index (entity_type, entity_id, changed_at DESC); keep “current” entity row read in the same transaction as the audit insert.
- **PII**: Audit stores before/after values; treat as sensitive; apply same access control as the entity (e.g. only own family’s data).

---

## 8. Implementation Outline

1. **DB**: Add `audit_events` (Option A) and migration; or extend `visit_history` + add `illness_history` (Option B) with a `changes` JSONB column.
2. **Backend**:  
   - Add `buildFieldDiff(current, payload, entityConfig)` and `normalizeForCompare(value)`.  
   - In `PUT /api/visits/:id` and `PUT /api/illnesses/:id`: after loading current row, compute diff from current vs validated update; insert into audit table; then run UPDATE.  
   - Add `GET /api/visits/:id/history` and `GET /api/illnesses/:id/history` (paginated) returning audit rows with `changes`.
3. **Frontend**:  
   - Visit/Illness detail page: “History” section; fetch history API; list events.  
   - Expand or modal: `<AuditDiffView changes={event.changes} fieldLabels={...} />` with before → after (and optional del/ins styling).
4. **Optional**: Human-readable `summary` (e.g. “Updated visit_date, weight_value”) generated from the keys of `changes` for list view.

This gives you full field-level change tracking, database-backed and queryable, with a clear path to extend to Child and other entities later.
