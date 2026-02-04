# Illnesses Router Module

**Status:** Could benefit from refactoring (691 lines - moderately large)

## Current Structure

`illnesses.ts` - Well-organized file containing:
- Validation helpers (lines 29-53): illness type validation
- GET / - List illnesses with filters (lines 59-124)
- GET /:id/history - Audit history with optimistic locking support (lines 129-214)
- GET /:id - Get single illness (lines 219-249)
- POST / - Create illness (lines 254-336)
- PUT /:id - Update illness with optimistic locking (lines 341-543)
- DELETE /:id - Delete illness (lines 548-572)
- GET /metrics/heatmap - Illness heatmap data for calendar view (lines 577-689)

## Functionality

### Core CRUD
- Full create, read, update, delete operations
- Optimistic locking (version field) to prevent concurrent modification conflicts
- Authorization via family access control
- Pagination and filtering support

### Audit Trail
- Field-level change tracking using `buildFieldDiff()`
- Audit events stored in `audit_events` table
- History endpoint shows who changed what and when
- Includes optimistic locking version numbers in history

### Illness Types
Supports tracking: flu, strep, RSV, COVID, cold, stomach_bug, ear_infection, hand_foot_mouth, croup, pink_eye, other

### Heatmap Metrics
- Groups illness data by date for calendar visualization
- Counts illnesses per day
- Shows which illness types occurred on each date
- Filterable by child, date range, illness type

## Recommended Future Split

```
routers/illnesses/
├── index.ts              # Router setup & route definitions
├── validation.ts         # Illness type validation
├── handlers/
│   ├── list.ts          # GET / - List with filters & pagination
│   ├── get.ts           # GET /:id - Get single illness
│   ├── create.ts        # POST / - Create new illness
│   ├── update.ts        # PUT /:id - Update with optimistic locking
│   ├── delete.ts        # DELETE /:id - Delete illness
│   ├── history.ts       # GET /:id/history - Audit trail
│   └── heatmap.ts       # GET /metrics/heatmap - Calendar data
└── README.md             # This file
```

## Why It's Medium-Sized

1. **Full CRUD + extras** - 7 endpoints total (5 CRUD + audit + heatmap)
2. **Optimistic locking** - Version tracking prevents race conditions
3. **Audit trail** - Complete change history with field diffs
4. **Heatmap aggregation** - Complex SQL for calendar visualization
5. **Array field handling** - `types` array requires special validation

## Unique Features

### Optimistic Locking
```typescript
if (input.expected_version !== undefined) {
  if (existingIllness.version !== input.expected_version) {
    throw new ConflictError('Illness modified by another user');
  }
}
```

### Heatmap Metrics
- Returns `{ date, count, types[] }` for each day with illnesses
- Powers calendar heat visualization in frontend
- Efficient SQL aggregation

### Array Type Handling
- Illness can have multiple types (e.g., ["flu", "ear_infection"])
- PostgreSQL array type with custom validation
- Properly serialized in API responses

## Comparison to Other Routers

- **Simpler than visits.ts** (1383 lines) - fewer specialized fields
- **Simpler than attachments.ts** (1266 lines) - no file upload complexity
- **More complex than measurements.ts** (326 lines) - has audit + heatmap
- **Similar to** medical-events.ts in structure

## Refactoring Priority

**Medium** - Could be split for consistency, but not urgently needed. The file is well-organized and endpoints are clearly separated with comment blocks.

## Notes

- Shares audit logic with visits router (could be abstracted)
- Heatmap could be generalized for other date-based metrics
- Optimistic locking pattern could be extracted to middleware
