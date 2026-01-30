# Welcome & Family Creation Plan

## 1. Goals

- **New users (self-signup)** get a guided "Welcome" flow that walks them through naming their family and optionally adding their first child, so they understand the app and have a clear starting point.
- **Invited users** who join via an invite link already have a family; we give a short, optional tip instead of the full Welcome flow.
- **Existing users** can create additional families from Settings when needed (POST /api/families).
- **Family creation** is explicit when the user creates an account (we can keep backend auto-creation of "My Family" and let Welcome rename it) or optional for existing users who want a new family.

---

## 2. When the Welcome Flow Runs (Triggers)

| Scenario | Show full Welcome? | Notes |
|----------|-------------------|--------|
| **Just registered** (RegisterPage → Home) | Yes | They have one family ("My Family") from backend. Welcome: name it, optionally add first child, then "You're all set." |
| **Just joined via invite** (InviteAcceptPage → Home) | No (or minimal) | They already have a family. Show success message + optional one-time tip: "Add children from the Family tab or Settings → Family → Members." |
| **Existing user, first login after we ship Welcome** | Heuristic or flag | See §5. We need a way to show Welcome only once (or only when "never completed"). |
| **Existing user, already has family + children** | No | They're set up. |
| **Existing user, has family but 0 children** | Optional | Could show a short "Add your first child?" prompt on Home once; not the full Welcome. |

**Recommendation**: Use a **backend flag** `users.onboarding_completed` (boolean, default false). Set to true when user completes or skips Welcome. Then:
- **Full Welcome** shows when: authenticated, `onboarding_completed === false`, and user is **not** "just joined via invite" (we can pass state from InviteAcceptPage: `state: { fromInvite: true }` and set onboarding_completed true after invite accept so they skip Welcome).
- **Invite path**: After accept invite, set `onboarding_completed = true` (or a separate "invite_onboarding_seen") so they don’t see the full Welcome; optionally show a small inline tip on Home once.

---

## 3. Family Creation: Backend & Current Behavior

### 3.1 Current behavior

- **Registration** (POST /api/auth/register): Backend calls `getOrCreateDefaultFamilyForUser(userId)`, which creates a family named **"My Family"** and adds the user as owner if they have none. So every new user has exactly one family after signup.
- **Invite accept**: User is added to an **existing** family (no new family created).
- **Create child**: Uses `getOrCreateDefaultFamilyForUser` when no `family_id` is sent; otherwise uses the given family (user must be owner/parent). There is **no** POST /api/families today; families are only created inside `getOrCreateDefaultFamilyForUser`.

### 3.2 What we need

1. **POST /api/families** (create family for existing user)
   - Body: `{ name: string }`.
   - Creates a new family, adds the current user as **owner**, returns the family (id, name, role).
   - Use case: "Create family" in Settings for multi-family, and optionally "Create your first family" in Welcome if we ever stop auto-creating on register (we can keep auto-create and use Welcome only to rename + add first child).

2. **Optional: Don’t auto-create family on register**
   - Alternative: Registration only creates the user; Welcome step 1 is "Create your family" (name), which calls POST /api/families. Then they have one family with a chosen name. This is a bigger change; **recommendation**: keep auto-create "My Family" and use Welcome to **rename** it (PATCH /api/families/:id already exists).

3. **Onboarding flag**
   - Add `users.onboarding_completed` (boolean, default false). Set true when user completes or skips Welcome (and optionally when they accept an invite). GET /api/users/me or GET /api/auth/me could return it; or a small GET /api/users/me/onboarding and PATCH to set completed.

---

## 4. Welcome Flow Steps (New Account, Not Invite)

A linear, step-by-step flow (modal or dedicated route) with progress and skip.

### Step 1: Welcome

- **Title**: "Welcome to Trajectory"
- **Copy**: Short line: "Let's set up your family in a few quick steps. You can skip anytime."
- **Actions**: "Get started" (next), "Skip" (mark onboarding complete, go to Home).

### Step 2: Name your family

- **Title**: "Name your family"
- **Copy**: "This helps you tell families apart if you're in more than one (e.g. after joining an invite)."
- **Field**: Text input, pre-filled with current family name (from GET /api/families; they have one "My Family"). Save with PATCH /api/families/:id.
- **Actions**: "Next", "Back", "Skip".

### Step 3: Add your first child (optional)

- **Title**: "Add your first child"
- **Copy**: "You can add a child now or do it later from the Family tab or Settings."
- **Actions**:
  - **"Add a child"** → Navigate to Add Child page with `state: { familyId: <their family id>, fromOnboarding: true }`. After create, redirect back to Welcome step 4 (or to Home with "You're all set" toast).
  - **"Skip"** → Next step.
- **Back**: Step 2.

### Step 4: You're all set

- **Title**: "You're all set"
- **Copy**: "Your family is ready. Add more children from the **Family** tab on the home page, or from **Settings → Family → Members**."
- **Actions**: "Go to Home" → set onboarding_completed true, navigate to `/`.

**Progress**: Show "Step 1 of 4" … "Step 4 of 4" (or dots). **Skip** on steps 1–3 marks onboarding complete and goes to Home.

---

## 5. Invite Path (Joined via Invite)

- **Current**: InviteAcceptPage → accept → `navigate('/', { state: { message: "You've joined the … family!" } })`.
- **Add**: Pass `state: { fromInvite: true, message: ... }`. On first Home load with `fromInvite === true`, set onboarding as completed (so they never see full Welcome) and optionally show a **one-time tip** (e.g. banner or short modal): "You've joined [Family name]. Add children from the **Family** tab or **Settings → Family → Members**." Dismiss = hide tip for this session (or persist "invite tip seen" in backend/localStorage).

No multi-step Welcome for invite users; keep the experience short.

---

## 6. Persistence: "Onboarding completed"

### Option A (recommended): Backend

- **Migration**: Add `users.onboarding_completed BOOLEAN NOT NULL DEFAULT false`.
- **PATCH /api/users/me/onboarding** (or PATCH /api/users/me with `{ onboarding_completed: true }`): Set flag. Called when user completes or skips Welcome.
- **GET /api/users/me** (or auth response): Include `onboarding_completed` so the frontend can decide whether to show Welcome.
- **Invite accept**: Backend sets `onboarding_completed = true` for that user when they accept an invite (so they skip Welcome).

**Pros**: One source of truth, works across devices. **Cons**: Requires migration and API changes.

### Option B: Client-only (MVP)

- **localStorage** `trajectory_onboarding_completed = 'true'`. Set when user completes or skips Welcome. Clear on logout.
- **Invite**: After accept, set the same key so Welcome doesn’t show.
- **No backend change.** **Cons**: Not synced across devices; clearing storage shows Welcome again.

**Recommendation**: Implement Option B for MVP (fast to ship). Add Option A later and prefer backend value when present.

---

## 7. Where Welcome Renders

- **Option 1 – Dedicated route**: `/welcome` (or `/onboarding`). After login/register, redirect to `/welcome` if onboarding not completed; Welcome component renders the steps. When done, redirect to `/`.
- **Option 2 – Modal / overlay**: User lands on Home; if onboarding not completed, a full-screen or large modal shows the Welcome steps. No separate URL.
- **Option 3 – Inline on Home**: First time, Home shows Welcome content instead of the normal Family tab until they complete or skip.

**Recommendation**: **Option 1** (`/welcome`). Clear URL, easy to "Resume onboarding" if we add that later, and keeps Home simple. After register or login, ProtectedRoute (or a small wrapper) checks onboarding; if not completed and not fromInvite, redirect to `/welcome`. Welcome page at `/welcome` shows steps; on "Go to Home" or Skip, set completed and navigate to `/`.

---

## 8. Existing User: Create Another Family (Settings)

- **Backend**: **POST /api/families** with body `{ name: string }`. Creates family, adds current user as owner, returns `{ id, name, role }`.
- **Settings → Family**: In the Management tab, add a **"Create family"** card or button (e.g. at top or bottom). Opens a small form or modal: "Family name" → submit → POST /api/families → refresh family list, show new family’s cards.
- No Welcome flow for this; it’s an explicit action in Settings.

---

## 9. Implementation Phases

### Phase 1 – Backend & minimal wiring (no UI yet)

1. **Migration**: Add `users.onboarding_completed BOOLEAN NOT NULL DEFAULT false`.
2. **GET /api/users/me** (or auth payload): Include `onboarding_completed`. If there’s no "me" yet, add GET /api/users/me returning `{ id, email, name, onboarding_completed }` and optionally preferences.
3. **PATCH /api/users/me** (or PATCH /api/users/me/onboarding): Allow setting `onboarding_completed: true`.
4. **POST /api/families**: Create family `{ name }`, add user as owner, return family. Validate user is authenticated.
5. **Invite accept**: When a user accepts an invite, set `onboarding_completed = true` for that user (so they skip Welcome).

### Phase 2 – Welcome flow (new account)

1. **Client**: Decide "show Welcome" from backend `onboarding_completed` or localStorage (MVP).
2. **Route**: Add `/welcome` and a WelcomePage component. After login/register, if onboarding not completed and not `fromInvite`, redirect to `/welcome`.
3. **WelcomePage**: Four steps (Welcome → Name family → Add first child (optional) → You're all set). Progress indicator, Back, Next, Skip. Step 2: load family list, pre-fill name, PATCH on Next. Step 3: link to Add Child with state; or inline minimal form. Step 4: set onboarding completed, "Go to Home".
4. **RegisterPage**: After successful register, navigate to `/welcome` (or `/` with state that triggers redirect to `/welcome` in ProtectedRoute) instead of `/`, when backend says onboarding not completed.
5. **InviteAcceptPage**: After accept, navigate with `state: { fromInvite: true }`; on Home (or in a thin wrapper), when `fromInvite` and first time, set onboarding completed and optionally show one-time tip.

### Phase 3 – Invite tip & polish

1. **One-time tip** for invite users: Banner or compact modal on Home: "You've joined [Family]. Add children from the Family tab or Settings → Family → Members." Dismissible, don’t show again (session or flag).
2. **Skip** on Welcome: Always set onboarding completed and go to Home.
3. **Accessibility**: Focus management, step titles, aria-live for progress.

### Phase 4 – Create family in Settings (existing user)

1. **Settings → Family → Management**: "Create family" button or card. Modal or inline form: family name → POST /api/families → refresh list.
2. **Empty state**: When user has zero families (edge case: left all), show "Create a family" CTA that uses the same POST.

---

## 10. Summary Table

| Feature | New user (register) | Invited user | Existing user |
|--------|----------------------|--------------|----------------|
| Family at start | One family "My Family" (backend) | Joined existing family | Has ≥1 family |
| Welcome flow | Full (4 steps: welcome, name family, add child, done) | No; optional short tip | No (or heuristic once) |
| Create family | N/A (already have one) | N/A | Settings → "Create family" → POST /api/families |
| Onboarding completed | Set when they finish or skip Welcome | Set when they accept invite | Already true |

---

## 11. Open Decisions

1. **MVP persistence**: Prefer localStorage for "onboarding completed" first, or add backend flag in Phase 1?
2. **Step 3**: Full Add Child page (with back to Welcome step 4) vs. inline minimal "Name + DOB" on Welcome step 3?
3. **Invite tip**: Always show once, or only when they have 0 children in the joined family?

This plan keeps family creation and Welcome aligned with existing auth and invite flows, supports multi-family (create family in Settings), and stays within current data protection (all scoped to the user and their families).
