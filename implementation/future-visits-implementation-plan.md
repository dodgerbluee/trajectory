# Future Visits (Appointments) — Implementation Plan

**Status:** Implementation-ready plan  
**Principle:** A future visit is the same `Visit` entity; behavior is entirely date-driven. No new entity, no appointment status, no "mark complete" flow.

---

## 1. High-Level Architecture Overview

- **Data model:** No new tables. The existing `visits` table stores all visits; `visit_date` may be in the past or future.
- **Semantics:** `visit_date > today` → future visit (appointment); `visit_date ≤ today` → normal (completed/same-day) visit. The frontend derives this at render time; the backend stays generic.
- **Backend:** Minimal change: allow `visit_date` in the future on create/update; add an optional filter `future_only` (or equivalent) for listing. No server-side "is_future" field or status.
- **Frontend:** Drives UX: Add Future Visit flow (limited fields), conditional visibility/editability on Visit Detail and Edit, and an Upcoming Visits dashboard on the home page.

**Tradeoff:** Keeping logic date-driven and frontend-controlled avoids backend complexity and keeps a single source of truth (the date). The only cost is that "today" is evaluated in the client (and optionally in API filters), which is acceptable for this product.

---

## 2. Backend vs Frontend Changes

### Backend

| Area | Change |
|------|--------|
| **Visits table** | No schema change. `visit_date` already has no CHECK restricting it to past/today. |
| **POST /api/visits** | Allow `visit_date` in the future. Remove or relax any "visit_date must be ≤ today" validation if present. Validate required fields only; optional fields remain optional. |
| **PUT /api/visits/:id** | Allow updating `visit_date` to future or past; no special rules. Existing partial-update and validation rules stay. |
| **GET /api/visits** | Support optional query: `future_only=true` (or `visit_date_after=YYYY-MM-DD`). When set, return only visits where `visit_date > today` (or `> given date`), same ordering (e.g. `visit_date ASC` for "soonest first"). |
| **GET /api/visits/growth-data** | No change. Continues to use wellness visits with measurements; future visits have no measurements so are excluded by existing logic. |
| **Validation** | Add no new validations that block future dates. Sick-visit-specific rules (e.g. illnesses array) apply only when the client sends those fields; for "Add Future Visit" the client sends only the limited subset. |

### Frontend

| Area | Change |
|------|--------|
| **Child overview (ChildDetailPage)** | Add a second entry point: "Add Future Visit" alongside "Add Visit". Both can use the same VisitTypeModal to choose type; from there, "Add Visit" → existing Add Visit flow (date ≤ today); "Add Future Visit" → new flow (date > today, limited fields). |
| **Add Future Visit flow** | New route/page or same AddVisitPage with a mode (e.g. `?future=1` or route `/children/:id/visits/new/future`). Form collects only: visit type, visit date (must be > today), doctor, location, notes. No outcome sections (measurements, illness, injury, vision, dental outcomes, vaccines, prescriptions). Submit creates one Visit row with those fields; all others null. |
| **Visit Detail (VisitDetailPage)** | For visits with `visit_date > today`: show only the pre-appointment fields (type, date, doctor, location, notes). For visits with `visit_date ≤ today`: show full detail as today. Pre-appointment notes always visible. |
| **Edit Visit (EditVisitPage)** | Same date rule: if `visit_date > today`, only allow editing the "future" fields (type, date, doctor, location, notes). Once the user changes the date to today or past, or the date has passed, show full form. |
| **Home page** | New "Upcoming Visits" section above the family/child cards. Lists future visits across all children, sorted by visit_date ASC. Click → navigate to child and visit (e.g. `/children/:id` with focus or `/visits/:id`). |
| **Visit form sections** | Reuse existing sections (Visit Information, Notes) for the future-visit flow. Other sections (Measurements, Illness, Injury, Vision, Dental, Vaccines, Prescriptions) are hidden in "Add Future Visit" and in Edit when visit is future. |
| **Date helpers** | Centralize "today" in one place (e.g. `date-utils`: `isTodayOrPast(visitDate)`, `isFutureVisit(visit)`). Use for conditional rendering and for validation (e.g. Add Visit: date ≤ today; Add Future Visit: date > today). |

### What Explicitly Does Not Change

- No new tables, no new entity types.
- No `appointment_status` or `is_completed` (or similar) column or API field.
- No "mark as complete" or "convert appointment to visit" flow.
- No change to audit, attachments, or permissions model for visits.
- No change to growth-data or wellness-only logic; future visits simply don’t have measurements yet.
- Visit type enum and validation (wellness, sick, injury, vision, dental) unchanged.

---

## 3. Data Model Considerations

- **Existing schema:** `visits.visit_date` is `DATE NOT NULL`. There is no CHECK that `visit_date <= CURRENT_DATE`. Confirming in migrations: the only date-related CHECKs are `illness_start_date <= visit_date`, `end_date >= ...`, and the removed `next_appointment_date >= visit_date`. So storing future dates is already valid.
- **Required vs optional for a future visit:**  
  - Required: `child_id`, `visit_date`, `visit_type`.  
  - Optional but collected in Add Future Visit UI: `location`, `doctor_name`, `notes`.  
  - Optional and not collected: `title`, all outcome fields (measurements, illness, injury, vision, dental, vaccines, prescriptions, tags).  
  So for POST, keep current rules: only `child_id`, `visit_date`, `visit_type` required; everything else optional. No backend distinction between "future" and "past" payloads beyond date value.
- **Validation rules:**  
  - Create: Accept any valid `visit_date` (past, today, or future). No "visit_date must be in the future" for the main POST (that’s a UX rule for the Add Future Visit form only).  
  - Edit: Allow changing `visit_date` to any valid date.  
  - Sick visit: If the client sends `visit_type === 'sick'` and includes `illnesses`, existing validation (e.g. at least one illness) still applies. Add Future Visit simply doesn’t send those.  
- **Indexing / queries:**  
  - Existing index `idx_visits_child_date ON visits(child_id, visit_date DESC)` is used for per-child lists.  
  - For "upcoming visits" (all children), add an optional index if needed: e.g. `idx_visits_visit_date_asc` on `(visit_date ASC)` or a partial index `WHERE visit_date > CURRENT_DATE` for the future-only list. Start with the existing index and only add this if the upcoming-visits query is slow (e.g. after measuring with realistic data).

---

## 4. Frontend Implementation Plan

### 4.1 Shared Date / Future-Visit Helpers

- **File:** `frontend/src/lib/date-utils.ts` (or keep `validation.ts` for form validation only).  
- Add:  
  - `getTodayDateString(): string` — same as current `getTodayDate()` in validation, or import from there.  
  - `isFutureDate(dateString: string): boolean` — true if `dateString` (YYYY-MM-DD) is after today (compare as dates, no time).  
  - `isFutureVisit(visit: { visit_date: string }): boolean` — true if `isFutureDate(visit.visit_date)`.  
- Use these everywhere for "is this a future visit?" so that "today" is consistent (client local date).

### 4.2 API Client

- **File:** `frontend/src/lib/api-client.ts`  
- **visitsApi.getAll:** Add optional param `future_only?: boolean`. When true, call `GET /api/visits?future_only=true` (and combine with existing `child_id`, `visit_type`, etc. as needed).  
- **visitsApi.create:** No change; same payload. For Add Future Visit, the frontend sends only the allowed fields.

### 4.3 Add Future Visit Flow — Entry and Form

- **Entry points:**  
  - **ChildDetailPage:** Next to the existing "Add Visit" (or wherever VisitTypeModal is opened), add "Add Future Visit". Either two buttons that both open VisitTypeModal with a different mode, or one modal that after type selection offers "Add Visit" vs "Add Future Visit". Recommended: two buttons — "Add Visit" (current behavior), "Add Future Visit" (opens type modal then goes to Add Future Visit form with chosen type).  
  - **VisitsSidebar:** Same idea: second button "Add Future Visit" that opens the same type picker then navigates to the future flow with selected type.  
- **Route:** Prefer a single Add Visit page with a query or state: e.g. `/children/:childId/visits/new?future=1` or `/visits/new?future=1&child_id=...&type=...`. Alternative: dedicated route `/children/:childId/visits/new/future` that only shows the limited form.  
- **Add Future Visit form (same page, different mode):**  
  - Sections shown: only Visit Information (with date, location, doctor, and optionally title/tags if you want), and Notes.  
  - Visit Date: no `max` (or `max` set to a far future date). Client-side validation: date must be > today; show error otherwise.  
  - Child selector: same as Add Visit when not pre-selected by URL.  
  - Visit type: from URL/state (from type modal).  
  - Hide: Measurements, Illness, Injury, Vision, Dental, Vaccines, Prescriptions, Attachments (or allow attachments for future visits — design choice; can be Phase 2).  
  - Submit: `visitsApi.create` with `child_id`, `visit_date`, `visit_type`, `location`, `doctor_name`, `notes` (and optionally `title`, `tags`). Omit outcome fields or send as null.  
- **VisitInformationSection:** In SectionContents, support a prop or context flag like `allowFutureDate: boolean`. When true, do not set `max={getTodayDate()}` on the date input and show appropriate hint ("Date must be in the future").

### 4.4 Visit Detail Page — Conditional Content

- **File:** `frontend/src/pages/VisitDetailPage.tsx`  
- Compute `const isFuture = isFutureVisit(visit);`.  
- **When `isFuture`:**  
  - Show: visit type, visit date, location, doctor, notes (and title/tags if present).  
  - Hide: all outcome blocks (measurements, illness, injury, vision, dental, vaccines, prescriptions).  
  - Show "Edit" (or "Edit appointment") that goes to Edit page; there, same limited fields until date is in the past.  
- **When `!isFuture`:** Keep current full detail view.  
- Pre-appointment notes (the `notes` field) are always shown for both.

### 4.5 Edit Visit Page — Field-Level Visibility

- **File:** `frontend/src/pages/EditVisitPage.tsx` (or equivalent; currently edit is at `/visits/:id/edit`).  
- Load visit; compute `isFuture = isFutureVisit(visit)`.  
- **When `isFuture`:**  
  - Only show sections: Visit Information (date, location, doctor, notes; date editable, can be moved to today or past), Notes.  
  - Allow changing visit_date to today or a past date; after save, next time the user opens the visit it will show the full form.  
- **When `!isFuture`:** Show all sections as today.  
- Optional: if the user changes the date to today or past in the form, switch to full form immediately (client-side) so they can fill outcome fields in the same session.

### 4.6 Visit Form Context / Section Registry

- **VisitFormContext:** Add an optional `isFutureVisit?: boolean` (or `allowFutureDateOnly?: boolean` for add flow). Sections that are "outcome-only" check this and render nothing (or a message) when true.  
- **SectionContents (VisitInformationSection):** Use context to set date input min/max and validation message (past-only vs future-only).  
- **Other sections (Measurements, Illness, Injury, Vision, Dental, Vaccines, Prescriptions):** If `context.isFutureVisit` (or add-mode future), return null or minimal placeholder so the form layout stays simple.

### 4.7 Home Page — Upcoming Visits Dashboard

- **Placement:** Above the Family tab content (or above the child cards in the Family tab).  
- **Data:** On Home load (or when Family tab is active), call `visitsApi.getAll({ future_only: true })` (no `child_id`). Backend returns visits for all accessible children with `visit_date > today`, ordered by `visit_date ASC`, e.g. limit 20.  
- **UI:** Section title "Upcoming Visits" (or "Appointments"). List of items: each item shows child name, visit type, visit date, and optionally location/doctor. Click → navigate to `/visits/:id` or `/children/:childId` (with optional state to scroll to or open that visit).  
- **Empty state:** If no future visits, show a short message and optionally a CTA "Add Future Visit" (e.g. from first child or a generic "Add" that goes to visit type modal).  
- **Permissions:** Only show section and "Add Future Visit" when the user can edit at least one child; use existing family/child access.

### 4.8 VisitCard and Lists

- **VisitCard:** No change required. It already shows type, date, location, doctor, etc. Future visits will just have fewer badges (no weight, vaccines, etc.). Optionally add a small "Upcoming" badge when `isFutureVisit(visit)` for clarity.  
- **Child detail visits list:** Shows all visits (past and future). Sort remains e.g. by date DESC; future visits appear at the top. No filtering by default.

### 4.9 Validation and Date Rules (Frontend)

- **Add Visit (existing):** Visit date must be ≤ today. Keep using `getTodayDate()` as `max` and existing validation.  
- **Add Future Visit:** Visit date must be > today. Use `min={tomorrowOrNextDay(getTodayDate())}` and validate on submit.  
- **Edit (future visit):** Allow any date; when user sets date to today or past, show full form.

---

## 5. Edge Cases and Guardrails

| Scenario | Handling |
|----------|----------|
| **Missed visits** | A visit with `visit_date` in the past and no outcome data is just an "incomplete" visit. No special state. User can open it and use Edit to add outcomes. No auto-"mark missed" or reminder; that’s out of scope. |
| **Same-day visits** | `visit_date === today` is treated as a normal visit: full form and full detail. No special flow. |
| **Editing date forward/backward** | Edit allows changing `visit_date`. If moved from future to today/past, show full form (and allow saving outcomes). If moved from today/past to future, restrict to pre-appointment fields again. Backend always accepts the new date. |
| **Time zones** | Use date-only (YYYY-MM-DD) and "today" in the user’s local date (browser). Backend stores and returns dates without time. For "today" in API filters (e.g. `future_only`), backend should use server date or a supplied `as_of_date`; document that "future" means `visit_date > server’s current date` so that edge cases around midnight are consistent. Prefer server date for the list filter so that all users see the same list for "upcoming". |
| **Growth data** | No change. Growth chart uses wellness visits with measurements; future visits have no measurements so they don’t appear. |
| **Sick/Injury/Vision/Dental future** | Add Future Visit allows any type (wellness, sick, injury, vision, dental). Only pre-appointment fields are collected. After the date passes, user edits and fills type-specific outcomes. No validation that "sick must have illnesses" on create when it’s a future visit (client doesn’t send illnesses). |

---

## 6. Phased Rollout Plan

### Phase 1 — Backend and Add Future Visit (ship together or backend first)

1. **Backend**  
   - Ensure POST/PUT allow future `visit_date` (no validation that blocks it).  
   - Add `future_only` (or `visit_date_after`) to GET /api/visits; implement filter and ordering (visit_date ASC when future_only).  
   - Deploy; verify existing behavior (past/today visits) unchanged.  

2. **Frontend — Add Future Visit**  
   - Add date helpers (`isFutureDate`, `isFutureVisit`).  
   - Add `future_only` to visitsApi.getAll.  
   - Add "Add Future Visit" entry (ChildDetailPage + VisitsSidebar): second button → type modal → Add Visit page with `?future=1` (or dedicated route).  
   - Add Visit page: when `future=1`, show only Visit Information + Notes; date validation "must be in the future"; submit limited payload.  
   - Test: create future visit, see it on child timeline and in list.  

**Ship:** Users can add future visits from child page and sidebar. No dashboard yet.

### Phase 2 — Visit Detail and Edit Behavior

3. **Visit Detail**  
   - VisitDetailPage: if `isFutureVisit(visit)`, show only type, date, location, doctor, notes; hide outcome sections.  

4. **Edit Visit**  
   - EditVisitPage: if `isFutureVisit(visit)`, show only future-allowed sections; when date is changed to today/past, show full form.  

**Ship:** Future visits display and edit correctly; no confusion with full outcome form before the date.

### Phase 3 — Upcoming Visits Dashboard

5. **Home page**  
   - Fetch upcoming visits (`future_only: true`), render "Upcoming Visits" above family section.  
   - List item: child name, type, date, link to visit or child.  
   - Empty state + "Add Future Visit" CTA if desired.  

**Ship:** Full feature set.

### What Can Be Shipped Independently

- Backend `future_only` and relaxed date validation can ship first; frontend can still only add past/today visits until Phase 1 frontend is done.  
- "Add Future Visit" form (Phase 1 frontend) can ship without Visit Detail/Edit behavior (Phase 2); users can add future visits and see them in the list/detail as full (empty) visits until Phase 2.  
- Upcoming dashboard (Phase 3) is the only piece that strictly depends on Phase 1 (data + list support).

### Minimizing Regression Risk

- No change to existing Add Visit flow except possibly sharing one page with a `future` mode.  
- All new behavior is gated on `visit_date > today` or on explicit "Add Future Visit" entry.  
- Existing visits (all past or today) behave exactly as before.  
- Add tests: one backend test for GET with `future_only`; one frontend test that creating a future visit and opening detail shows limited fields.

---

## 7. Future Extensibility Notes

- **Calendar export (ICS / provider links):** Not in scope. When you add it, use the same Visit model; filter by `visit_date > today` for "export upcoming." No schema change needed.  
- **Location as richer entity:** Keep `location` as a string on Visit. Later, you can add a `location_id` FK and/or a locations table; future visits can stay with free-text location until then.  
- **Notifications/reminders:** Out of scope. When you add them, a job can query visits where `visit_date` is in the next N days and send reminders; again, no change to the Visit model.

---

## 8. Summary Checklist

- [ ] Backend: allow future `visit_date` on POST/PUT; add `future_only` (or equivalent) to GET /api/visits.  
- [ ] Frontend: date helpers; `visitsApi.getAll({ future_only })`; Add Future Visit entry points and form (limited fields + future-date validation).  
- [ ] Visit Detail and Edit: conditional sections based on `isFutureVisit(visit)`.  
- [ ] Home: Upcoming Visits section, empty state, link to visit/child.  
- [ ] No new entity, no status field, no "mark complete" flow.  
- [ ] Optional: "Upcoming" badge on VisitCard when `isFutureVisit(visit)`.
