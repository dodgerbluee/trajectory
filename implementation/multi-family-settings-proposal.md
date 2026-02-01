# Multi-Family Settings: Principal Engineer Analysis & Proposal

## 1. Current State Summary

### Backend (already multi-family capable)
- **Data model**: `family_members(user_id, family_id, role)` allows a user to be in multiple families. Children belong to a single `family_id`. All access checks use `getFamilyIdsForUser(userId)` → scope to those families only.
- **APIs**: `GET /api/families` returns all families the user is a member of (id, name, role). Children, visits, illnesses, etc. are scoped by **all** accessible child IDs (across all families). No API exposes another user’s families or children.
- **Create child**: Uses `getOrCreateDefaultFamilyForUser(userId)` (first family where user is owner). No way for the client to choose which family when creating a child.

### Frontend gaps for multi-family UX
- **Home > Family tab**: Shows `families[0].name` as the single header and a **flat grid of all children**. With 2+ families, the header is wrong and kids from different families are mixed.
- **Settings > Family**:
  - **Management** sub-tab: Already correct — one card per family (Overview, Members, Invite, Pending Invites). Scales to N families.
  - **Members** sub-tab: Single flat list of **all** children + one global “Add Child” link. No family grouping; “Add Child” goes to `/children/new` and backend assigns default family.
- **Child type**: API does not return `family_id` on Child, so the frontend cannot group children by family without a new endpoint or response change.

---

## 2. Data Protection Standards

### What we preserve
- **Strict family scoping**: Every family/child/member/invite endpoint checks membership or edit permission. No cross-family data leakage.
- **Role-based actions**: Owner/parent vs read_only is enforced server-side (invites, role changes, export, delete family, etc.). UI hiding is secondary to API enforcement.
- **Export**: Already limited to owner/parent and to `getAccessibleChildIds(userId)` (children in the user’s families only).

### What we add (no regression)
- Exposing **`family_id` on Child** in API responses: safe. The user can only receive children they can access; knowing which family a child belongs to does not grant access to other families. It is the same scope, more precise.
- **“Create family”** (optional): Would create a new family and add the current user as owner. No access to other users’ data.
- **“Add Child” in context of a family**: Backend already supports creating a child in a given family if we add a `family_id` (or target family) to the create payload and enforce that the user is owner/parent of that family.

### Conclusion
Multi-family UX can be implemented without weakening data protection. We only expose family identity for data the user already has access to and add explicit family context where needed.

---

## 3. Experience Design (XD) Principles Applied

- **Clarity of place**: User should always know “which family” they’re looking at or acting on. No ambiguous “your family” when there are several.
- **Consistency**: Same mental model on Home and Settings — “families → each has members/children” — with consistent naming and hierarchy.
- **Progressive disclosure**: Default view can stay simple (e.g. one “primary” or first family); multiple families are clearly listed and expandable/selectable without clutter.
- **Scannability**: Family names as section headers; children grouped under the right family; actions (Add Child, Invite) clearly tied to that family.
- **Accessibility**: Headings and landmarks that reflect family structure; labels like “Smith Family – Members” so screen readers get context.

---

## 4. Proposed Approach

### 4.1 Information Architecture (Settings > Family tab)

- **Keep two sub-tabs**: “Management” and “Members” (familiar; Management = family-level, Members = children + add child).
- **Management** (current behavior, minor copy tweaks):
  - One **card per family** (already in place).
  - Each card: Family name, role badge, Overview (rename/delete/leave), Family Members (adults), Invite Member, Pending Invites.
  - Optional: “Create family” CTA at top or bottom for users who are owner in at least one family (so we have a clear “you can create” rule).
- **Members** (restructured for multi-family):
  - **Group by family**: One section per family the user can see (owner/parent/read_only).
  - Each section:
    - **Heading**: “[Family name]” (e.g. “Smith Family”) with optional role badge.
    - **List of children** in that family (avatars, names, ages, Edit/Delete for canEdit).
    - **“Add Child”** only for that family, only if user is owner/parent (same as today’s canEdit). Link could be ` /children/new?family_id=123` or a dedicated route; backend creates child in that family.
  - Ordering: e.g. by family name or “primary first” if we introduce a primary family later.

This gives:
- **Single family**: Same as today — one section, one list, one Add Child.
- **Multiple families**: Clear sections, no mixed list, and Add Child is explicitly per family (meets “which family?” clarity and data protection).

### 4.2 Home > Family Tab

- **Option A – Family switcher**: Dropdown or tabs at top (“Smith Family” | “Jones Family”). When selected, show only that family’s name as header and only that family’s children in the grid. “Add Child” in that view creates in the selected family.
- **Option B – Sections on one page**: No switcher; show sections “[Family name]” and under each the kids for that family (like Settings > Members). Single scroll, everything visible. “Add Child” per family under each section (or under the first family you can edit).

**Recommendation**: **Option B** for Home. It matches the Settings > Members grouping, avoids “which family is selected?” state, and keeps the home tab a single scroll. Option A can be added later if we want a “focus on one family” mode.

### 4.3 Backend / API Changes (minimal)

1. **Include `family_id` on Child in API responses**  
   - In `formatChildForResponse` (and any other child serialization), add `family_id: row.family_id`.  
   - Frontend `Child` type: add `family_id: number`.  
   - Enables grouping by family everywhere without new endpoints.

2. **Create child in a specific family**  
   - **Option 1**: `POST /api/children` body accepts optional `family_id`. If present, require user is owner/parent of that family and create child there; else keep current behavior (default family).  
   - **Option 2**: New endpoint `POST /api/families/:id/children` (create child in family `:id`). Same permission check.  
   - Recommendation: **Option 1** (optional `family_id` on existing POST) to avoid extra routes and keep “add child” a single client flow with an optional context.

3. **“Create family” (optional)**  
   - `POST /api/families` with body `{ name: string }`: create family, add current user as owner, return family. No change to data protection.

### 4.4 Frontend Changes (summary)

| Area | Change |
|------|--------|
| **Types** | Add `family_id` to `Child` when API is updated. |
| **Settings > Family > Members** | Group `childrenList` by `family_id`; render one section per family with heading + list + “Add Child” (link with `?family_id=...` or state). Only show Add Child per family where user has edit role (use family role from `families`). |
| **Home > Family** | Group children by `family_id`; render sections “[Family name]” and child cards under each. Optionally “Add Child” per family under each section (or one primary). |
| **Add Child** | When navigating from a family context (e.g. Settings Members for Family X), pass `family_id` (query or state); on submit, send `family_id` in POST body. Fallback: no `family_id` → backend uses default (current behavior). |
| **Primary / default family** | Optional: allow user to set “primary family” (e.g. in preferences) and use it for Home header and default for Add Child when no context. Can be phase 2. |

---

## 5. Why This Meets High XD and Data Protection Standards

### XD
- **Clear hierarchy**: Family → members (adults) and Family → children. Same on Settings and Home.
- **No ambiguity**: “Add Child” is always in the context of a named family section; family name appears in section headings.
- **Scannable**: Sections and headings make it easy to see “this is Smith Family, these are their kids; this is Jones Family, these are theirs.”
- **Consistent**: Management tab (per-family cards) and Members tab (per-family sections) share the same “one family per block” model.
- **Accessible**: Proper headings (e.g. h2 per family name), landmarks, and labels so assistive tech can announce family context.

### Data protection
- **No new data exposure**: We only add `family_id` on children the user already has access to. All create/update/delete flows continue to be gated by family membership and role.
- **Explicit family on create**: Sending `family_id` when creating a child is validated server-side (user must be owner/parent of that family). Prevents any cross-family creation.
- **Export / list / everything else**: Still scoped by `getFamilyIdsForUser` and `getAccessibleChildIds`; no cross-family leakage.

---

## 6. Implementation Order (suggested)

1. **Backend**: Add `family_id` to child response; add optional `family_id` to `POST /api/children` with permission check.
2. **Frontend types**: Add `family_id` to `Child`.
3. **Settings > Family > Members**: Group children by `family_id`, render per-family sections with “Add Child” per family (and pass `family_id` when navigating to Add Child).
4. **Home > Family**: Group children by `family_id`, render per-family sections with family name as section heading.
5. **Add Child page**: Read `family_id` from route state or query; include in POST when present.
6. **(Optional)** “Create family” endpoint + UI and/or “primary family” preference for default header and default Add Child.

This order keeps data protection and API contracts correct first, then aligns the UI with a clear, scalable multi-family model that meets high XD and security standards.
