# Audit Diff UI Component

Component for rendering field-level before/after diffs in change history, with visual distinction for additions, removals, and changes.

---

## Component Structure

**File:** `frontend/src/components/AuditDiffView.tsx`

**Props:**
```typescript
interface AuditDiffViewProps {
  changes: Record<string, { before: unknown; after: unknown }>;
  fieldLabels?: Record<string, string>;  // Optional: custom labels
  formatValue?: (field: string, value: unknown) => string;  // Optional: custom formatter
}
```

**Usage:**
```tsx
import AuditDiffView from '../components/AuditDiffView';
import type { AuditHistoryEvent } from '../types/api';

function HistoryItem({ event }: { event: AuditHistoryEvent }) {
  return (
    <div>
      <h3>{event.summary || 'Change'}</h3>
      <AuditDiffView 
        changes={event.changes}
        fieldLabels={{
          visit_date: 'Visit Date',
          weight_value: 'Weight (lbs)',
          notes: 'Notes'
        }}
      />
    </div>
  );
}
```

---

## Diff Rendering Logic

### Change Type Detection

1. **Added** (`before` is null/undefined/empty, `after` has value):
   - Shows: `— → [new value]`
   - Style: Green background, bold text

2. **Removed** (`before` has value, `after` is null/undefined/empty):
   - Shows: `[old value] → —`
   - Style: Red background, strikethrough text

3. **Changed** (both have values, different):
   - Shows: `[old value] → [new value]`
   - Style: Yellow/orange background for both

### Value Formatting

- **Dates**: Automatically detected (YYYY-MM-DD or ISO) and formatted via `formatDate()`
- **Booleans**: `true` → "Yes", `false` → "No"
- **Numbers**: Displayed as-is
- **Strings**: Displayed as-is (dates are detected and formatted)
- **Arrays**: Joined with commas (e.g. `["flu", "cold"]` → "flu, cold")
- **Objects**: JSON stringified (pretty-printed)
- **null/undefined/empty**: Displayed as "(empty)"

### Field Labels

- Default: Converts snake_case to Title Case (e.g. `visit_date` → "Visit Date")
- Custom: Provide `fieldLabels` prop to override (e.g. `{ visit_date: "Appointment Date" }`)

---

## Styling Recommendations

The component uses CSS classes that follow the app's design system:

| Class | Purpose |
|-------|---------|
| `.audit-diff` | Container for all field diffs |
| `.audit-diff-field` | Individual field change row |
| `.audit-diff-field--added` | Added field (green left border) |
| `.audit-diff-field--removed` | Removed field (red left border) |
| `.audit-diff-field--changed` | Changed field (yellow left border) |
| `.audit-diff-before--removed` | Removed value (red background, strikethrough) |
| `.audit-diff-after--added` | Added value (green background, bold) |
| `.audit-diff-after--changed` | Changed value (yellow background) |

**Colors:**
- **Added**: `--color-success` (green) with `--color-success-light` background
- **Removed**: `--color-danger` (red) with `--color-danger-light` background
- **Changed**: `--color-warning` (yellow/orange) with `--color-warning-light` background

**Dark mode**: Automatically supported via `[data-theme="dark"]` selectors.

---

## Example Rendered Output

### Example 1: Mixed Changes

**Input:**
```json
{
  "visit_date": { "before": "2026-01-15", "after": "2026-01-16" },
  "weight_value": { "before": 24.5, "after": 25 },
  "notes": { "before": "Follow up in 2 weeks", "after": null },
  "doctor_name": { "before": null, "after": "Dr. Smith" }
}
```

**Rendered:**
```
┌─────────────────────────────────────────────────┐
│ Visit Date                                      │
│ January 15, 2026 → January 16, 2026           │
│ [yellow bg]        [yellow bg]                  │
├─────────────────────────────────────────────────┤
│ Weight Value                                     │
│ 24.5 → 25                                       │
│ [yellow bg]  [yellow bg]                        │
├─────────────────────────────────────────────────┤
│ Notes                                            │
│ Follow up in 2 weeks → —                        │
│ [red bg, strikethrough]                         │
├─────────────────────────────────────────────────┤
│ Doctor Name                                      │
│ — → Dr. Smith                                    │
│              [green bg, bold]                   │
└─────────────────────────────────────────────────┘
```

### Example 2: Boolean Change

**Input:**
```json
{
  "ordered_glasses": { "before": false, "after": true }
}
```

**Rendered:**
```
┌─────────────────────────────────────────────────┐
│ Ordered Glasses                                  │
│ No → Yes                                         │
│ [yellow bg]  [yellow bg]                        │
└─────────────────────────────────────────────────┘
```

### Example 3: Array Change (Illnesses)

**Input:**
```json
{
  "illnesses": { 
    "before": ["flu"], 
    "after": ["flu", "ear_infection"] 
  }
}
```

**Rendered:**
```
┌─────────────────────────────────────────────────┐
│ Illnesses                                        │
│ flu → flu, ear_infection                         │
│ [yellow bg]  [yellow bg]                        │
└─────────────────────────────────────────────────┘
```

### Example 4: Empty Changes

**Input:**
```json
{}
```

**Rendered:**
```
┌─────────────────────────────────────────────────┐
│ (empty) No field changes                         │
└─────────────────────────────────────────────────┘
```

---

## Integration Example

```tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AuditDiffView from '../components/AuditDiffView';
import { apiClient } from '../lib/api-client';
import type { AuditHistoryEvent } from '../types/api';
import { formatDateTime } from '../lib/date-utils';

function VisitHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<AuditHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.get<{ data: AuditHistoryEvent[] }>(`/visits/${id}/history`)
      .then(res => {
        setHistory(res.data.data);
        setLoading(false);
      });
  }, [id]);

  const fieldLabels = {
    visit_date: 'Visit Date',
    weight_value: 'Weight (lbs)',
    height_value: 'Height (in)',
    notes: 'Notes',
    doctor_name: 'Doctor',
    // ... more labels
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Change History</h1>
      {history.map(event => (
        <div key={event.id} className="history-item">
          <div className="history-header">
            <span>{formatDateTime(event.changed_at)}</span>
            <span>{event.user_name || 'System'}</span>
            <span>{event.action}</span>
          </div>
          <AuditDiffView 
            changes={event.changes}
            fieldLabels={fieldLabels}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## Accessibility

- Semantic HTML structure
- Color is not the only indicator (uses borders, strikethrough, and text)
- Responsive: stacks vertically on mobile (arrow rotates 90°)
- High contrast in both light and dark modes
