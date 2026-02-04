# Markdown Diff Example

Example of how field-level diffs would be rendered in markdown format (similar to GitLab/GitHub diffs).

---

## Example 1: Single Field Update

**Input:**
```json
{
  "visit_date": { "before": "2026-01-15", "after": "2026-01-16" }
}
```

**Rendered Markdown:**
```markdown
### Visit Date
- **Before:** January 15, 2026
- **After:** January 16, 2026
```

**GitLab-style:**
```diff
 Visit Date
- January 15, 2026
+ January 16, 2026
```

---

## Example 2: Multiple Field Update

**Input:**
```json
{
  "visit_date": { "before": "2026-01-15", "after": "2026-01-16" },
  "weight_value": { "before": 24.5, "after": 25 },
  "notes": { "before": "Follow up in 2 weeks", "after": null }
}
```

**Rendered Markdown:**
```markdown
### Visit Date
- **Before:** January 15, 2026
- **After:** January 16, 2026

### Weight Value
- **Before:** 24.5 lbs
- **After:** 25 lbs

### Notes
- **Before:** Follow up in 2 weeks
- **After:** _(removed)_
```

**GitLab-style:**
```diff
 Visit Date
- January 15, 2026
+ January 16, 2026

 Weight Value
- 24.5 lbs
+ 25 lbs

 Notes
- Follow up in 2 weeks
+ (removed)
```

---

## Example 3: Addition (null → value)

**Input:**
```json
{
  "doctor_name": { "before": null, "after": "Dr. Smith" }
}
```

**Rendered Markdown:**
```markdown
### Doctor Name
- **Before:** _(empty)_
- **After:** Dr. Smith
```

**GitLab-style:**
```diff
 Doctor Name
- (empty)
+ Dr. Smith
```

---

## Example 4: Removal (value → null)

**Input:**
```json
{
  "notes": { "before": "Follow up in 2 weeks", "after": null }
}
```

**Rendered Markdown:**
```markdown
### Notes
- **Before:** Follow up in 2 weeks
- **After:** _(removed)_
```

**GitLab-style:**
```diff
 Notes
- Follow up in 2 weeks
+ (removed)
```

---

## Example 5: Array Change

**Input:**
```json
{
  "illnesses": { 
    "before": ["flu"], 
    "after": ["flu", "ear_infection"] 
  }
}
```

**Rendered Markdown:**
```markdown
### Illnesses
- **Before:** flu
- **After:** flu, ear_infection
```

**GitLab-style:**
```diff
 Illnesses
- flu
+ flu, ear_infection
```

---

## Example 6: Boolean Change

**Input:**
```json
{
  "ordered_glasses": { "before": false, "after": true }
}
```

**Rendered Markdown:**
```markdown
### Ordered Glasses
- **Before:** No
- **After:** Yes
```

**GitLab-style:**
```diff
 Ordered Glasses
- No
+ Yes
```

---

## Example 7: Long Text Change

**Input:**
```json
{
  "notes": {
    "before": "Patient presented with mild symptoms. Recommended rest and fluids.",
    "after": "Patient presented with moderate symptoms. Recommended rest, fluids, and follow-up in 3 days."
  }
}
```

**Rendered Markdown:**
```markdown
### Notes
- **Before:** Patient presented with mild symptoms. Recommended rest and fluids.
- **After:** Patient presented with moderate symptoms. Recommended rest, fluids, and follow-up in 3 days.
```

**GitLab-style (side-by-side):**
```diff
 Notes
- Patient presented with mild symptoms. Recommended rest and fluids.
+ Patient presented with moderate symptoms. Recommended rest, fluids, and follow-up in 3 days.
```

---

## Example 8: No Changes (Empty Diff)

**Input:**
```json
{}
```

**Rendered Markdown:**
```markdown
_No field changes detected._
```

---

## Test Assertions for Markdown Rendering

```typescript
describe('Markdown diff rendering', () => {
  it('renders single field change', () => {
    const changes = {
      visit_date: { before: '2026-01-15', after: '2026-01-16' },
    };
    const markdown = renderMarkdownDiff(changes);
    
    expect(markdown).toContain('Visit Date');
    expect(markdown).toContain('January 15, 2026');
    expect(markdown).toContain('January 16, 2026');
  });

  it('renders addition (null → value)', () => {
    const changes = {
      doctor_name: { before: null, after: 'Dr. Smith' },
    };
    const markdown = renderMarkdownDiff(changes);
    
    expect(markdown).toContain('(empty)');
    expect(markdown).toContain('Dr. Smith');
  });

  it('renders removal (value → null)', () => {
    const changes = {
      notes: { before: 'Follow up', after: null },
    };
    const markdown = renderMarkdownDiff(changes);
    
    expect(markdown).toContain('Follow up');
    expect(markdown).toContain('(removed)');
  });

  it('renders empty diff', () => {
    const changes = {};
    const markdown = renderMarkdownDiff(changes);
    
    expect(markdown).toContain('No field changes');
  });
});
```
