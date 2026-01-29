# Partial Updates and Multiple Forms (Change Tracking)

How the audit logic handles partial updates so that **missing fields are never treated as deletions** and **only explicitly updated fields** are tracked, supporting multiple forms that edit different subsets of fields.

---

## 1. Distinguishing unchanged vs omitted fields

| Situation | Meaning | In request body | In payload | In diff? |
|-----------|--------|------------------|------------|----------|
| **Omitted** | Field was not sent; “leave as-is” | Key **absent** | Not added | **No** — never considered |
| **Unchanged** | Field was sent with same value | Key present, value same as current | Key present | **No** — normalized compare is equal |
| **Explicitly updated** | Field was sent with new value | Key present, value different | Key present | **Yes** |
| **Explicitly cleared** | Field was sent as null/empty | Key present, value `null` or `""` | Key present | **Yes** — recorded as removal |

Rule: **only keys that appear in the request body are ever added to the payload and thus to the diff.**  
So “unchanged” vs “omitted” is purely: **key present in body** (unchanged or changed) vs **key absent from body** (omitted, never considered).

- **Omitted** = key not in `req.body` → backend never adds it to `payload` → `buildFieldDiff` only iterates `Object.keys(payload)` → omitted keys are never in the diff and are never treated as deletions.
- **Explicit clear** = client sends `notes: null` or `notes: ""` → key is in payload with null/empty → diff records “before → null”.

---

## 2. How to prevent false diffs

1. **Backend only diffs keys present in the request**  
   Handlers add a field to the update payload only when `req.body.<field> !== undefined`. So:
   - Form A sends `{ visit_date, weight_value }` → only those two are compared and possibly written to audit.
   - Form B sends `{ notes, doctor_name }` → only those two are compared.
   - No field is ever treated as “deleted” just because it was not sent.

2. **Forms should send only fields they edit (recommended)**  
   Each form can send only the subset of fields it actually changes. The backend will only consider that subset. Sending the full entity is also fine: only keys present in the body are used for the diff; normalization (below) avoids most representation mismatches.

3. **Normalization avoids representation false diffs**  
   `normalizeForCompare` in `lib/field-diff.ts`:
   - **Dates**: `Date` and date-like strings (e.g. `"2026-01-15"`, `"2026-01-15T00:00:00.000Z"`) are normalized to the same ISO date string (`YYYY-MM-DD`).
   - **Numbers**: Numeric strings (e.g. `"24.5"`) are normalized to numbers so they compare equal to `24.5`.
   - **Strings**: Trimmed so `"  x  "` and `"x"` compare equal.
   - **null / undefined / empty string**: All treated as null for comparison.

So “unchanged” is determined **after** normalization; only real value changes produce a diff.

---

## 3. Request payloads and backend handlers

**No change to the request contract is required.**

- **Existing behavior is correct**: Handlers already add to the payload only when `req.body.<field> !== undefined`. So:
  - **Visits**: `payload` is built only for keys present in `req.body` (see comment in `PUT /api/visits/:id`).
  - **Illnesses**: `input` is built only for keys present in `req.body` (see comment in `PUT /api/illnesses/:id`).
- **Frontend**: Each form can keep sending only the fields it edits (or the full entity). The backend will only diff and audit the keys that are present in the body. No need to send a special “changed keys” list.

**Summary**

- **Omitted** = key not in request body → never in payload → never in diff → never treated as deletion.
- **Explicitly updated** = key in request body → in payload → diffed; only recorded if value actually changed after normalization.
- Multiple forms can send different subsets of fields; each request only produces audit entries for the fields that were sent and actually changed.
