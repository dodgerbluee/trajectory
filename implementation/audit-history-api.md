# Change History API

API for fetching change (audit) history for a Visit or Illness. Data comes from `audit_events`; results are ordered newest → oldest and include user info, timestamps, and structured diffs.

---

## API route definition

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/api/visits/:id/history` | Change history for visit `id` (entity_type=visit, entity_id=id) |
| **GET** | `/api/illnesses/:id/history` | Change history for illness `id` (entity_type=illness, entity_id=id) |

- **:id** – Visit ID or Illness ID (integer).
- **Auth**: Visits history uses `AuthRequest` (optional or required per app); illnesses history is unauthenticated unless the app applies auth middleware.
- **Filtering**: Backend filters by `entity_type` + `entity_id`; no query params required.
- **Order**: Newest first (`ORDER BY changed_at DESC`).

---

## Response shape

Standard wrapper: `{ data: T, meta?: { timestamp: string } }`.

**T** = array of **AuditHistoryEvent**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Audit event ID (from audit_events.id) |
| `entity_type` | `'visit' \| 'illness'` | Entity type |
| `entity_id` | number | Visit or illness ID |
| `user_id` | number \| null | User who made the change (null if system or unknown) |
| `user_name` | string \| null | User display name (from users.name) |
| `user_email` | string \| null | User email (from users.email) |
| `action` | `'created' \| 'updated' \| 'deleted'` | Action performed |
| `changed_at` | string | ISO 8601 timestamp (e.g. `"2026-01-28T14:30:00.000Z"`) |
| `changes` | Record<string, { before, after }> | Field-level diff: key = field name, value = `{ before, after }` |
| `summary` | string \| null | Short summary (e.g. `"Updated visit_date, notes"`) |

---

## Example response payload

**Request:** `GET /api/visits/42/history`

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 3,
      "entity_type": "visit",
      "entity_id": 42,
      "user_id": 5,
      "user_name": "Jane Doe",
      "user_email": "jane@example.com",
      "action": "updated",
      "changed_at": "2026-01-28T14:30:00.000Z",
      "changes": {
        "visit_date": { "before": "2026-01-15", "after": "2026-01-16" },
        "weight_value": { "before": 24.5, "after": 25 },
        "notes": { "before": "Follow up in 2 weeks", "after": null }
      },
      "summary": "Updated visit_date, weight_value, notes"
    },
    {
      "id": 2,
      "entity_type": "visit",
      "entity_id": 42,
      "user_id": 5,
      "user_name": "Jane Doe",
      "user_email": "jane@example.com",
      "action": "updated",
      "changed_at": "2026-01-20T10:00:00.000Z",
      "changes": {
        "doctor_name": { "before": null, "after": "Dr. Smith" }
      },
      "summary": "Updated doctor_name"
    },
    {
      "id": 1,
      "entity_type": "visit",
      "entity_id": 42,
      "user_id": null,
      "user_name": null,
      "user_email": null,
      "action": "created",
      "changed_at": "2026-01-15T09:00:00.000Z",
      "changes": {},
      "summary": null
    }
  ],
  "meta": {
    "timestamp": "2026-01-28T15:00:00.000Z"
  }
}
```

**Request:** `GET /api/illnesses/7/history`

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 10,
      "entity_type": "illness",
      "entity_id": 7,
      "user_id": 5,
      "user_name": "Jane Doe",
      "user_email": "jane@example.com",
      "action": "updated",
      "changed_at": "2026-01-27T11:00:00.000Z",
      "changes": {
        "severity": { "before": 5, "after": 7 },
        "end_date": { "before": "2026-01-20", "after": "2026-01-25" }
      },
      "summary": "Updated severity, end_date"
    }
  ],
  "meta": {
    "timestamp": "2026-01-28T15:00:00.000Z"
  }
}
```

Empty history returns `{ "data": [], "meta": { "timestamp": "..." } }`.
