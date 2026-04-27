# Mobile Friendliness Guide

This document outlines the mobile-friendliness improvements implemented and best practices for maintaining them.

## What Was Implemented

### 1. **Touch Target Sizing (44×44px minimum)**
   - **Problem**: Small buttons and form fields are hard to tap on mobile
   - **Solution**: All interactive elements now have `min-height: 44px` (WCAG 2.5.5 level AAA)
   - **Files Updated**:
     - `src/shared/components/Button.module.css`
     - `src/shared/components/FormField.module.css`
     - `src/shared/styles/base.css`
   - **Details**:
     - Buttons grow to 48px on mobile (< 640px)
     - Form inputs: 44px normally, 48px on mobile
     - Still looks good on desktop with natural padding

### 2. **Font Size Prevention (No Zoom on Input)**
   - **Problem**: iOS zooms in when input font size is < 16px
   - **Solution**: Inputs now have `font-size: 16px` on mobile
   - **Files Updated**:
     - `src/shared/styles/base.css`
     - `src/shared/components/FormField.module.css`
   - **Details**: 
     - Uses media query `@media (max-width: 640px)`
     - Desktop: 1rem (16px base)
     - Mobile: explicitly 16px (prevents iOS zoom)

### 3. **Small Phone Breakpoint (< 480px)**
   - **Problem**: Header and layout crammed on iPhone SE/smaller phones
   - **Solution**: Added new breakpoint for screens < 480px
   - **Files Updated**:
     - `src/app/components/Layout.module.css`
   - **Details**:
     - Header logo: 28px (down from 32px)
     - App title: font-size-sm (down from font-size-base)
     - Tighter padding: spacing-xs/spacing-sm instead of md/lg
     - Main content padding: spacing-md instead of spacing-lg

### 4. **Responsive Breakpoint Tokens**
   - **New breakpoints added** to `src/shared/styles/tokens.css`:
     - `--bp-xs`: 375px (iPhone SE)
     - `--bp-sm`: 480px (small phones)
     - `--bp-md`: 640px (larger phones)
     - `--bp-lg`: 768px (tablets)
     - `--bp-xl`: 1024px (small desktop)
     - `--bp-2xl`: 1200px (desktop)
     - `--bp-3xl`: 1600px (large desktop)
   - **Usage**: `@media (max-width: var(--bp-md))` in your CSS

### 5. **Card Padding Optimization**
   - **Files Updated**: `src/shared/components/Card.module.css`
   - **Details**:
     - Desktop: padding var(--spacing-lg) = 1.5rem
     - Mobile: padding var(--spacing-md) = 1rem
     - Maintains readability while saving screen space

### 6. **HTML Head Optimization**
   - **Confirmed**: Viewport meta tag already present in `index.html`
   - ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     ```

## Testing Checklist

### Manual Testing on Phone (375px - iPhone SE)
- [ ] Header logo fits without wrapping
- [ ] Navigation items don't overlap
- [ ] Buttons are easy to tap (44px+ minimum)
- [ ] Form inputs don't zoom on focus
- [ ] Cards don't have excessive padding
- [ ] No horizontal scrolling
- [ ] Links are spaced apart (not cramped)

### DevTools Testing
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Test these viewport sizes:
   - **Mobile**: 375px (iPhone SE)
   - **Mobile**: 414px (iPhone XR)
   - **Tablet**: 768px (iPad)
   - **Desktop**: 1024px+ (normal desktop)
4. Rotate between portrait and landscape
5. Test these interactions on each size:
   - Tap all buttons
   - Type in form fields
   - Scroll through long lists
   - Swipe/navigate between pages

### Expected Results
- ✅ Layout reflows smoothly
- ✅ No overflow/horizontal scroll
- ✅ Touch targets are large (44-48px)
- ✅ Text is readable
- ✅ Forms don't zoom on input focus
- ✅ Modals fit on screen

## Best Practices for Future Changes

### 1. **Always Set Minimum Touch Targets**
```css
.button {
  padding: var(--spacing-sm) var(--spacing-lg);
  min-height: 44px;  /* ← Required! */
  min-width: 44px;   /* ← For small icon buttons */
}
```

### 2. **Use Mobile-First CSS**
```css
/* Start with mobile (small screens) */
.card {
  padding: var(--spacing-md);    /* Small padding on mobile */
}

/* Then enhance for larger screens */
@media (min-width: 768px) {
  .card {
    padding: var(--spacing-lg);  /* More breathing room */
  }
}
```

### 3. **Use Breakpoint Tokens**
```css
/* ✅ Good - uses tokens */
@media (max-width: var(--bp-md)) {
  /* Mobile styles */
}

/* ❌ Avoid - hardcoded values */
@media (max-width: 640px) {
  /* Mobile styles */
}
```

### 4. **Font Size for Form Inputs**
```css
/* Prevent zoom on iOS */
input,
textarea,
select {
  font-size: var(--font-size-base);  /* ← 1rem = 16px base */
  min-height: 44px;
}

@media (max-width: 640px) {
  input,
  textarea,
  select {
    font-size: 16px;  /* Explicitly 16px to prevent zoom */
  }
}
```

### 5. **Flexible Widths**
```css
/* ❌ Avoid fixed widths */
.container {
  width: 500px;  /* Too rigid */
}

/* ✅ Good - responsive */
.container {
  width: 100%;
  max-width: 500px;
  padding: 0 var(--spacing-md);
}
```

### 6. **Stack on Mobile, Side-by-Side on Desktop**
```css
.layout {
  display: flex;
  flex-direction: column;  /* Stack items vertically */
  gap: var(--spacing-md);
}

@media (min-width: var(--bp-lg)) {
  .layout {
    flex-direction: row;   /* Side by side on larger screens */
    gap: var(--spacing-lg);
  }
}
```

## Common Issues & Solutions

### Issue: Text Zooms When Tapping Input on iOS
**Cause**: Input font size < 16px
**Solution**: Set `font-size: 16px` on inputs for mobile
```css
@media (max-width: 640px) {
  input { font-size: 16px; }
}
```

### Issue: Buttons Are Hard to Tap
**Cause**: Button too small (< 44px)
**Solution**: Add `min-height: 44px` and `min-width: 44px`

### Issue: Long Lists Have Weird Spacing on Mobile
**Cause**: Padding designed for desktop only
**Solution**: Use `@media (max-width: var(--bp-md))` to reduce padding

### Issue: Modal Doesn't Fit on Small Phones
**Cause**: Modal has fixed width or large padding
**Solution**: 
```css
.modal {
  width: 90vw;
  max-width: 500px;
  max-height: 90vh;
}
```

### Issue: Header Takes Too Much Space on Mobile
**Cause**: Oversized logo/padding on small screens
**Solution**: Use breakpoint to resize:
```css
.logo {
  height: 32px;
}

@media (max-width: 480px) {
  .logo {
    height: 24px;
  }
}
```

## Files Modified

| File | Changes |
|------|---------|
| `src/shared/components/Button.module.css` | Added min-height 44px, mobile media query for 48px |
| `src/shared/components/FormField.module.css` | Added min-height 44px, 16px font size on mobile |
| `src/shared/components/Card.module.css` | Reduce padding on mobile |
| `src/shared/styles/base.css` | Form input sizing, better rendering, iOS prevention |
| `src/shared/styles/tokens.css` | Added breakpoint tokens (--bp-xs through --bp-3xl) |
| `src/app/components/Layout.module.css` | Added 480px breakpoint for small phones |

## Testing Resources

- **Google Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
- **Lighthouse**: DevTools → Lighthouse → Run on Mobile
- **Browser DevTools**: Ctrl+Shift+M to toggle device toolbar
- **Real Device Testing**: Test on actual phone (iOS & Android)

## Performance Impact

- ✅ **No additional CSS**: Uses existing tokens and media queries
- ✅ **No JavaScript changes**: Pure CSS improvements
- ✅ **Better touch experience**: Easier tapping, no accidental zooms
- ✅ **Improved accessibility**: WCAG 2.5.5 compliance for touch targets

## Future Improvements

- [x] Add viewport height workarounds for iOS address bar behavior (now using `100dvh`)
- [x] Add safe-area inset handling for notched devices (`env(safe-area-inset-*)`)
- [x] Mobile shell with bottom tab bar + FAB
- [ ] Test on various real devices (iPhone, Android, iPad)
- [ ] Add landscape orientation testing
- [ ] Audit all custom components for touch target compliance
- [ ] Consider adding `touch-action: manipulation` to prevent double-tap zoom

---

## Phase 0/1 Mobile Overhaul — Conventions

The mobile overhaul (April 2026) added foundational primitives. New code should follow these conventions.

### Breakpoint tokens (source of truth)

Defined in `:root` of `shared/styles/tokens.css`:

```
--bp-xs:  375px   /* iPhone SE */
--bp-sm:  480px   /* small phones */
--bp-md:  640px   /* large phones */
--bp-lg:  768px   /* tablet (mobile/desktop split) */
--bp-xl:  1024px  /* small desktop */
--bp-2xl: 1200px
--bp-3xl: 1600px
```

CSS spec disallows `var()` inside `@media` queries, so write the px values directly and keep them in sync with the tokens above. The mobile/desktop split is **`768px`**.

### Mobile-first media queries

Prefer mobile-first (`min-width`) for new code:

```css
.thing { /* mobile defaults */ }
@media (min-width: 768px) {
  .thing { /* tablet+ overrides */ }
}
```

Existing `max-width` queries are fine to keep; just don't mix both styles in one file.

### Safe-area + dynamic viewport

The following CSS variables are available globally (defined in `tokens.css`):

```
--safe-top, --safe-right, --safe-bottom, --safe-left   /* env() insets */
--bottom-tab-height: 56px
--mobile-header-height: 56px
```

Use `100dvh` (with `100vh` fallback) for full-height mobile layouts so iOS address-bar collapse doesn't cut off content.

The `<meta name="viewport">` tag includes `viewport-fit=cover` to enable safe-area insets on iOS.

### JS-driven mobile branching

When CSS-only responsive design isn't enough (e.g., rendering an entirely different component tree), use the hooks in `shared/hooks/useMediaQuery.ts`:

```ts
import { useIsMobile, useIsTabletUp, usePrefersReducedMotion } from '@shared/hooks';

const isMobile = useIsMobile(); // (max-width: 767px)
```

These hooks are SSR-safe (return `false` until hydrated) and use `matchMedia` with proper cleanup.

### Mobile shell

`app/components/Layout.tsx` renders `BottomTabBar` and `MoreMenuSheet` only when `useIsMobile()` is true. The container reserves `--bottom-tab-height + --safe-bottom` of bottom padding so fixed-bottom UI never overlaps content.

Header items annotated with `.hideOnMobile` collapse on phones (logout, theme toggle, etc., move into the More sheet).

### MobileSheet primitive

`shared/components/MobileSheet.tsx` is a bottom-sheet primitive with:
- Backdrop tap and `Escape` to dismiss
- Drag-to-dismiss from the handle area (opt-out via `disableDrag`)
- Focus trap + restoration
- Safe-area-aware bottom padding
- `prefers-reduced-motion` honored
- On tablet+ it auto-centers like a small modal

Use it on mobile in place of the existing `Modal.module.css` overlay pattern when you want native-feeling sheet UX.

### PWA manifest

`public/manifest.webmanifest` is linked from `index.html` and lets users "Add to Home Screen" with the Trajectory icon and theme color. A service worker / offline support is **not** included yet — that's a later phase.

---

## Phase 2 Mobile Overhaul — Home Feed

### Branching pattern

`HomePage.tsx` keeps the desktop `<Tabs>` shell intact and swaps **only** the Family tab content based on `useIsMobile()`:

- Mobile (`<768px`): renders `<MobileHomeFeed/>` — a vertical, scroll-driven feed.
- Tablet+ (`≥768px`): renders the existing `<FamilyTabView/>` two-column layout.

Other tabs (Visits / Illness / Trends) are unchanged in Phase 2; they'll get mobile-specific treatments in Phases 3–5.

### MobileHomeFeed composition

Top-down, the feed is:

1. Lightweight greeting + app title (no avatar, no buttons — keeps above-the-fold actionable).
2. `<ChildChipRow/>` — horizontal scroll of avatar chips. Selecting a chip filters the rest of the feed (`selectedChildId`). "All" is the default.
3. `<QuickActionsRow/>` — 4 primary tap targets (Log visit / Log illness / Measure / Attach). Routes deep-link with the active child where the destination supports it.
4. `<UpcomingVisitsCarousel/>` — horizontally swipeable cards (`scroll-snap-type: x mandatory`). Past-due visits get a warning treatment + "needs outcome" hint.
5. Active illnesses (only when non-empty) — compact tap rows.
6. Recent visits (last 5, sorted desc) with "See all" link that switches the parent tab to Visits via `setActiveTab('trends'|'visits')`.
7. Footer link that flips the parent tab to Trends (no separate route in Phase 2).

### PullToRefresh primitive

`shared/components/PullToRefresh.tsx` wraps the feed and reloads all its data sources concurrently when the user pulls past `threshold` (default 64px) at `scrollTop === 0`.

- Touch-only. Desktop falls through to normal scrolling.
- Uses `1 - exp(-dy / maxPull)` resistance so the pull asymptotically approaches `maxPull` (default 96px).
- Honors `prefers-reduced-motion`: skips the elastic translate but still triggers refresh.
- The wrapper does **not** create its own scroll container — it expects the page/feed to be the scroll context. This avoids nested scroll regions on mobile.

### Conventions for mobile-only sections

- Tap targets ≥44px high (most rows are 56px to leave room for two-line content).
- Horizontal scrollers hide their scrollbar (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) and use `scroll-snap` so cards self-align on swipe.
- Skeletons use a shared shimmer keyframe; gated by `prefers-reduced-motion`.
- Color tokens are referenced directly (no fallback chains) — all `--color-*-light` variants exist in both light and dark themes.

### Data hooks reused (no new fetchers)

- `useChildrenData`, `useFamiliesData`, `useUpcomingVisitsData` (existing home hooks).
- `useIllnessesData({ limit: 50 })` for active illnesses.
- `useAllVisits()` for recent visits — note this hook does **not** accept a `limit` arg; we slice `allVisits` client-side.

---

## Phase 3 — Visits (mobile)

### List view (`MobileAllVisitsView`)

- New mobile-only component at `features/visits/components/MobileAllVisitsView.tsx` (+ `.module.css`).
- `AllVisitsView.tsx` branches on `useIsMobile()` **before** calling `useAllVisits()` so the desktop hook never runs on mobile (and vice-versa). The split is implemented as two inner components (`DesktopAllVisitsView` body, mobile child) under the memoized default export.
- Sticky header (title + filter button). Filter button shows an active-count badge when child or visit-type filters are set.
- Filters open in a `MobileSheet` (child picker + visit-type chip picker). Date filtering is intentionally not exposed because `useAllVisits` does not support it today.
- Day-grouped tap rows replace the desktop `VisitCard` list. Each row is a `<Link>` to `/visits/:id` with the avatar, type icon, child name, time, and an `isFutureDate` badge.
- Infinite scroll via `IntersectionObserver` (sentinel `rootMargin: '200px'`, `PAGE_SIZE = 20`). The hook's pagination is ignored on mobile; we slice `allVisits` client-side after applying filters.
- Wrapped in `PullToRefresh` calling `reload`.

### Detail page (CSS-only)

- `VisitDetailPage.module.css` gets an `@media (max-width: 767.98px)` block at the bottom — no new components.
- `.infoItem` rows stack vertically on mobile (label becomes a small uppercase eyebrow above the value) so the 6.25rem desktop label column doesn't crowd narrow screens.
- `.measurementsGrid` collapses to two columns on phones with smaller card padding.
- `.historyDetailModal` becomes full-screen (`100% × 100%`, `border-radius: 0`) on phones.
- `.vaccinesCompact` / `.prescriptionsCompact` switch to vertical stacks.
- The page-level action button row (`Edit Visit`, `Delete Visit`, `Export to Calendar`) lives in `layoutStyles.detailActions` and already wraps acceptably on mobile; left untouched in this phase.

### Conventions

- Mobile-only components live next to their desktop siblings under `features/<area>/components/Mobile<Name>.tsx` and are exported from the same `index.ts` barrel.
- Branch **before** invoking data hooks whenever both variants would otherwise call the same hook — avoids duplicate subscriptions and double network traffic.
- Prefer CSS-only mobile responsiveness for detail/edit pages; reserve full mobile component rewrites for list/feed surfaces where the information density model genuinely differs.

---

## Phase 4 — Illnesses (mobile)

Mirrors Phase 3 (Visits) for the illnesses feature.

### List
- New `features/illnesses/components/MobileIllnessesView.tsx` (+ `.module.css`): sticky header with title + filter button (active-filter count badge), pull-to-refresh, day-grouped tap rows (avatar · thermometer icon · illness types · child · severity/fever/end · ongoing tag · chevron), `IntersectionObserver` infinite scroll, `MobileSheet` filter UI for **child + status (ongoing/ended) + illness type**.
- `AllIllnessesView` refactored to outer/inner pattern: outer calls `useIsMobile()` and renders `<MobileIllnessesView/>` *before* the desktop `useIllnesses()` subscription fires; desktop logic moved into inner `DesktopAllIllnessesView`. Default export wrapped in `memo()`.
- Mobile filter sorts illnesses by `start_date` desc and groups by ISO date for date headers; pagination is replaced by client-side infinite scroll (`PAGE_SIZE = 20`).
- `MobileIllnessesView` exported from `features/illnesses/components/index.ts`.

### Detail
- `IllnessDetailPage` already imports `VisitDetailPage.module.css` and inherits the Phase-3 mobile media-query block (stacked rows, 2-col measurements, full-screen history modal). No additional rules required.

### Add / Edit forms
- `AddIllnessPage` / `EditIllnessPage` use shared `visit-detail-layout.module.css` for the header (`detailHeader` + `detailActions`). Added a `@media (max-width: 767.98px)` block to that shared module: stacks header column-wise, makes action buttons full-width and `column-reverse` so the primary submit appears first, shrinks `headerTitle` to `--font-size-xl`. This automatically covers every page that uses the shared form layout (visit add/edit, illness add/edit).

### Verification
- `tsc --noEmit`: clean.
- `eslint` on changed TS files: clean.
- `vitest run`: 26/26.
- `vite build`: succeeds (chunk-size warning unchanged, Phase 8 target).

---

## Phase 5 — Trends / Charts

### Goal
Make the Trends surface (illness heatmap + growth charts) usable and pleasant on a phone, and align the data flow with the rest of the app's hook conventions.

### Stale-duplicate cleanup (prerequisite)
Before any UI work we deleted 15 unreferenced files under `src/shared/components/` that were left over from an earlier feature-folder migration:

`SingleMetricGrowthChart.tsx`, `GrowthChartTab.tsx`, `MetricsView.tsx`, `TrendsSidebar.tsx`, `MeasurementsInput.tsx`, `Heatmap.tsx`, `VaccineHistory.tsx`, `VaccineSidebar.tsx`, `PrescriptionInput.tsx`, `VisionRefractionCard.tsx`, `IllnessCard.tsx`, `IllnessesSidebar.tsx`, `IllnessNotification.tsx`, `IllnessesInput.tsx`, `IllnessEntryFormFields.tsx`.

Verified safe via codebase explore: zero path imports, no barrel re-exports, no co-located CSS or tests. Live versions live in `features/medical/components/*` and `features/illnesses/components/*`.

### Data hooks
Extracted two hooks (next to existing `useVisits` / `useIllnesses` patterns):

- `features/medical/hooks/useGrowthData.ts` — `(childId?) → { data, loading, error, reload }` wraps `visitsApi.getGrowthData`.
- `features/medical/hooks/useHeatmapData.ts` — `(year, childId?) → { heatmapData, children, loading, error, reload }` wraps `illnessesApi.getHeatmapData` + `childrenApi.getAll` in parallel.

Both are exported via `features/medical/hooks/index.ts` and re-exported from `features/medical/index.ts`.

### Refactors
- `GrowthChartTab.tsx`: dropped inline `useEffect` / `useState` / `visitsApi` calls; now consumes `useGrowthData(filterChildId)`.
- `MetricsView.tsx`: dropped inline data-loading; now consumes `useHeatmapData(selectedYear, filterChildId)`. Public props are unchanged so desktop callers (`HomePage`, `TrendsTab`) continue to work without modification.

### Mobile view
New `features/medical/components/MobileTrendsView.tsx` (+ `.module.css`):

- **Sticky header** with `Trends` title, child-picker chip (avatar + name, tap to open `MobileSheet` with full child list incl. an "All children" row), and a segmented `Illness | Growth` toggle.
- **Illness sub-view**: 2–3 stat cards (days with illness, total sick days, peak day), illness heatmap card with prev/next-year buttons, day-detail card on tap. Heatmap is wrapped in a horizontally-scrollable container so the year grid never overflows.
- **Growth sub-view**: horizontally-scrollable metric chip-row (`Weight / Height / Head Circ. / BMI`) + segmented `Value | Percentile` toggle + a single `<SingleMetricGrowthChart>` card (clamped to 280px height; the chart already uses `<ResponsiveContainer>` so this just shrinks the desktop layout). This replaces the desktop's 8-chart grid with one user-driven chart at a time, which is the right ergonomic call on mobile.
- `<PullToRefresh>` wraps the body and reloads both data sources in parallel.
- Props: `{ fixedChildId?, allowAllChildren? }`. When `fixedChildId` is set, the child picker is hidden — used by `ChildDetailPage`'s Trends tab.

Exported from `features/medical/components/index.ts` (`MobileTrendsView`) and re-exported via `features/medical/index.ts`.

### Integration
- `HomePage.tsx` Trends tab branches on `useIsMobile()` — phones get `<MobileTrendsView />`, desktop keeps `<TrendsSidebar /> + <MetricsView />`.
- `features/children/pages/tabs/TrendsTab.tsx` does the same branch and passes `fixedChildId={child.id}` so the picker is suppressed.
- The bottom of `HomePage` (`activeTab === 'trends'`) is now reachable via `BottomTabBar` with a clean mobile experience.

### Verification
- `tsc --noEmit`: clean.
- `eslint` on changed/new TS files: clean.
- `vitest run`: 26/26.
- `vite build`: succeeds (chunk-size warning unchanged, Phase 8 target).

---

## Phase 6 — Family / Children CRUD + Child Detail (Mobile)

CSS-only mobile pass for the Children section. After fully reading `ChildDetailPage.tsx` (746 lines of data-loading + tab-orchestration), a mobile rewrite would have duplicated state and data hooks for marginal layout gain. Instead, all mobile changes live in CSS modules and a small JSX migration to the shared detail-layout helpers.

### ChildDetailPage (CSS-only)
Mobile `@media (max-width: 767.98px)` block appended to `ChildDetailPage.module.css`:
- Compact hero: avatar shrinks 8.75rem → 5rem, name drops `--font-size-3xl` → `--font-size-xl`, header gap/padding tightened.
- `overviewMain` switches to `align-items: center` so avatar/name align cleanly when stacked horizontally.
- `overviewDetailItem` allows wrap; labels lose 120px min-width and step down to `--font-size-xs`.
- `overviewVisitsStrip` becomes a horizontally-scrollable, snap-aligned single row (`flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory`); cards get `min-width: 14rem` and `scroll-snap-align: start`. Negative horizontal margin + padding lets the strip bleed to the edges of the card. Webkit scrollbar hidden.

### Tabs (shared component)
Mobile `@media` block appended to `shared/components/Tabs.module.css` so every page that uses `<Tabs>` (ChildDetail, others) gets a horizontally-scrollable pill-style header on phones:
- Header `flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity`.
- Tab buttons become `flex: 0 0 auto`, get `--size-touch-min` height, smaller padding, and `white-space: nowrap` so labels never break.
- Scrollbar hidden via `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`.

### EditChildPage (JSX migration)
- Now imports shared `visit-detail-layout.module.css` and applies `detailHeader` + `headerTitle` to its page header, and `detailActions` (composed with `formLayout.formActions`) to the submit/cancel row.
- Inherits the existing mobile block in `visit-detail-layout.module.css`: header stacks column-wise, actions become full-width column-reverse so the primary "Save Changes" button lands first.
- No CSS file changes needed for EditChildPage — full mobile parity for free.

### AddChildPage (CSS-only)
Mobile `@media` block appended to `AddChildPage.module.css`:
- `topRow` flips to column so avatar sits above the name/details block.
- `avatarWrap` padding drops to `--spacing-sm` and self-centers.
- All `.row`, `.rowHalf`, and the previously triple-column `.birthRow` collapse to `grid-template-columns: 1fr` (kills the 10rem gap on phones).
- `.lbOz` and `.heightIn` inputs go full-width (`width: 100%`) instead of fixed 4.5rem.
- `.actions` becomes `flex-direction: column-reverse; gap: var(--spacing-xs)` and all action buttons are full-width — primary "Add Child" submit appears first.
- Avatar modal overlay padding zeroed so the cropper takes the full screen on phones.

### Verification
- `tsc --noEmit`: clean.
- `eslint` on `EditChildPage.tsx` + the three CSS modules: only pre-existing warnings (CSS files trip the JS parser, unchanged useEffect dep warning untouched).
- `vitest run`: 26/26.
- `vite build`: succeeds (chunk-size warning unchanged).

### Files Touched
- `src/features/children/pages/ChildDetailPage.module.css` — appended mobile block.
- `src/features/children/pages/AddChildPage.module.css` — appended mobile block.
- `src/features/children/pages/EditChildPage.tsx` — added `detailLayout` import, applied `detailHeader`/`headerTitle`/`detailActions`.
- `src/shared/components/Tabs.module.css` — appended mobile block (benefits all `<Tabs>` consumers).

---

## Phase 7 — Settings / Family / Admin (Mobile)

CSS-only mobile pass for the settings/admin shell and all family-management surfaces. Strategy mirrors Phase 6: target shared shells first so multiple pages benefit from a single edit.

### Shared shells (highest impact)

**`src/shared/styles/SettingsLayout.module.css`** — used by both `SettingsPage` and `AdminPage`. Mobile block:
- `cardGrid` collapses `13.75rem 1fr` → `1fr`.
- `sidebar` flips from vertical column to a horizontally-scrollable, snap-aligned pill row with hidden scrollbar; `sidebarItem` becomes `flex: 0 0 auto`, `white-space: nowrap`, `--size-touch-min` height.
- `saveRow` and `cardFooter` become `flex-direction: column-reverse` with full-width children.
- One edit → both Settings and Admin shells become single-column responsive.

**`src/shared/components/Modal.module.css`** — used by every modal in the app. Mobile block:
- Overlay drops padding and uses `align-items: stretch; justify-content: stretch`.
- `.content` and `.contentLarge` become `100% × 100vh` with `border-radius: 0` (true full-screen modal on phones).
- Header becomes sticky at the top of the scrolling viewport so the close button is always reachable.
- `.footer` and `.actions` switch to `column-reverse` with full-width buttons (primary action first).
- One edit → `AdminUserDetailModal`, `SSOProviderModal`, `CreateUserModal`, `VisitTypeModal`, avatar editor, etc. all gain proper mobile UX.

### Settings page (`SettingsPage.module.css`)
Per-feature mobile block:
- Section gaps tightened (`--spacing-md` instead of `--spacing-xl`).
- `userInfoRow` and `aboutItem` stack column-wise so labels/values don't fight for space.
- `expandableHeader` and `expandableContent` get reduced padding.
- `themeSelector` becomes full-width with each `themeOption` flexing equally so the three theme cards fit on a phone.
- `deleteFamilyContent` drops its 440px max-width.
- **Family management** (`familyManagementFamilyHeader`, `familyManagementFamilyBody`): header stacks column-wise; the trailing actions cell takes full width; reduced padding throughout.
- **Invite form** (`familySettingsInviteForm`): switches from horizontal `flex-wrap: wrap` to single-column with full-width children, including the role `<select>` which loses its `min-width: 160px`.
- **Invite link actions** (`familySettingsInviteLinkActions`): stacks column-wise.
- **Members tab kids grid** (`familyMembersKidsGrid`): collapses 2-col → 1-col.
- Family card avatars shrink 60px → 48px; `familyName` drops to 1.0625rem.

### Family/member rows
Three small, focused mobile blocks:
- **`MemberRow.module.css`** — `flex-direction: column`, `align-items: stretch`. Role `<select>` loses `min-width: 8.75rem`, badge loses `margin-left: auto`. Remove button row goes full-width.
- **`InviteRow.module.css`** — same treatment: info stacks above an `actions` row that wraps with `flex: 1 1 auto` children.
- **`FamilyOverviewCard.module.css`** — `.row` becomes column-stretch (label above value). `.editInput` drops 10rem min-width and goes 100% wide. `.actions` switches to `column-reverse` with full-width buttons. Card content padding reduced.

### Admin pages

**`AdminUsers.module.css`** — keeps the existing `tableWrap { overflow-x: auto }` fallback (a card-list rewrite would have been a much larger change for limited admin usage). Mobile block tightens cell padding, shrinks role-badge font, and bleeds the table to the screen edges via negative margin so more of it is visible per scroll.

**`AdminSSO.module.css`** — provider cards: `headerRow` and `providerHead` stack column-wise; `providerActions` becomes full-width with `flex: 1 1 auto` children. `metaList` collapses from 2-col grid to 1-col with semi-bold dt labels above values. SSO modal form `modalRow` switches to column with full-width children; `modalFooter` becomes `column-reverse` with full-width buttons.

### Auth pages
Already responsive — `LoginPage.module.css` has an existing `@media (max-width: 480px)` block, and Signup/Invite/OAuthCallback share or mirror it. No changes required for Phase 7.

### Verification
- `tsc --noEmit`: clean.
- `vitest run`: 26/26.
- `vite build`: succeeds. CSS bundle grew from 239.42KB → 245.28KB (+5.86KB raw, +0.75KB gzipped) for the entire Phases 6+7 mobile pass.

### Files Touched
- `src/shared/styles/SettingsLayout.module.css` (settings + admin shell)
- `src/shared/components/Modal.module.css` (every modal)
- `src/features/settings/pages/SettingsPage.module.css`
- `src/features/settings/components/MemberRow.module.css`
- `src/features/settings/components/InviteRow.module.css`
- `src/features/settings/components/FamilyOverviewCard.module.css`
- `src/features/admin/components/AdminUsers.module.css`
- `src/features/admin/components/AdminSSO.module.css`

### Not Touched (deliberate)
- `LoginPage.module.css`, `SignupPage.module.css`, `InvitePage.module.css`, `OAuthCallbackPage.module.css` — already mobile-OK.
- `AdminGeneral.module.css`, `AdminLogs.module.css` — small surfaces, already adequate; revisit if mobile usage materializes.
- `AdminUserDetailModal.module.css` — inherits the new shared `Modal.module.css` mobile block; per-content tightening can come later if needed.

---

## Phase 8 — Code-Splitting (Performance)

Not strictly mobile UI, but a major mobile-experience win: phones on cellular networks bear the brunt of large JS bundles. Pre-Phase-8 the app shipped **one ~1MB JS chunk** to every visitor regardless of route. After Phase 8 the initial JS drops by roughly **3×** in gzipped form, and most of the codebase loads on demand.

### Strategy
1. **Lazy-load every route component** in `App.tsx` via `React.lazy`, importing **directly from page files** (not feature barrels) so each lazy chunk stays tight.
2. **Wrap `<Routes>` in `<Suspense fallback={<LoadingSpinner />}>`** so any not-yet-loaded route shows the existing global spinner.
3. **Vite `manualChunks`** vendor isolation — function form so subpath imports get bucketed correctly:
   - `vendor-react` — `react`, `react-dom`, `react-router-dom`, `react-router`, `scheduler`
   - `vendor-recharts` — `recharts`, `d3-*` (Recharts' transitive deps)
   - `vendor-icons` — `react-icons/*`, `@hugeicons/*`
   - `vendor-crop` — `react-easy-crop`
   - `vendor-date-fns` — `date-fns` (leave as separate chunk; small, used widely)
4. **Cleanup**: removed three unused icon libraries from `package.json` — `@mdi/js`, `@mdi/react`, `@tabler/icons-react`, `phosphor-react`. `grep` confirmed zero importers in `src/`.
5. **Skipped**: per-component lazy for `SingleMetricGrowthChart` (8 use sites in `GrowthChartTab` + 1 in `MobileTrendsView` — too many call sites for a clean swap; `manualChunks` already isolates `recharts` to its own chunk, which captures most of the win). Same reasoning for `ImageCropUpload` (3 call sites, isolated via `vendor-crop`).

### Files touched
- `package.json` — removed `@mdi/js`, `@mdi/react`, `@tabler/icons-react`, `phosphor-react`.
- `src/App.tsx` — full rewrite of import block to `React.lazy`; `<Suspense fallback={<LoadingSpinner />}>` wraps `<Routes>`. `Layout`, `ErrorBoundary`, `LoadingSpinner`, `ProtectedRoute`, `AdminRoute` stay eager (small + needed before lazy chunks resolve).
- `vite.config.ts` — added `build.rollupOptions.output.manualChunks(id)` function with the buckets above.

### Verification
- `tsc --noEmit`: clean
- `vitest run`: 26/26
- `vite build`: succeeds, **chunk size warning gone**.

### Bundle sizes — before vs. after

**Before Phase 8** (single chunk):

| Asset | Raw | Gzip |
|---|---:|---:|
| `index.js` | **997.56 KB** | **277.61 KB** |
| `index.css` | 245.28 KB | 37.56 KB |

**After Phase 8** (41 JS chunks + per-route CSS chunks). Selected entries:

| Chunk | Raw | Gzip |
|---|---:|---:|
| `vendor-recharts` | 383.34 KB | 105.06 KB |
| `vendor-react` | 164.25 KB | 53.49 KB |
| **`index` (main app shell)** | **108.08 KB** | **30.39 KB** |
| `SettingsPage` | 41.67 KB | 10.81 KB |
| `ChildDetailPage` | 32.40 KB | 9.43 KB |
| `PrescriptionInput` | 30.14 KB | 8.74 KB |
| `vendor-icons` | 27.31 KB | 6.30 KB |
| `TrendsSidebar` | 27.14 KB | 7.69 KB |
| `vendor-crop` | 24.47 KB | 7.38 KB |
| `AdminPage` | 24.10 KB | 7.23 KB |
| `HomePage` | 19.68 KB | 6.26 KB |
| `VisitDetailPage` | 19.45 KB | 5.32 KB |
| Auth pages (Login/Signup/Invite/OAuth) | 4–6 KB each | <2 KB each |
| `EditChildPage` / `Add*Page` / `Edit*Page` | 4–9 KB each | 2–3.5 KB each |

### Initial-load JS by entry point

| First page visited | Chunks downloaded | Raw | Gzip |
|---|---|---:|---:|
| `/login` (unauthenticated) | `vendor-react` + `index` + `LoginPage` | ~277 KB | **~85 KB** |
| `/` (logged-in, Home) | `vendor-react` + `index` + `vendor-icons` + `HomePage` | ~319 KB | **~96 KB** |
| `/children/:id` | + `ChildDetailPage` (32 KB) + `vendor-crop` (24 KB) on demand | — | — |
| Any chart-heavy page | + `vendor-recharts` (383 KB / 105 KB gzip) loaded only when first chart route is hit | — | — |

vs. previous **all 277 KB gzip up-front** for every visitor on every page.

**Net result: roughly a ~3× reduction in initial gzipped JS for both authenticated and unauthenticated entry points**, with `recharts` (the single biggest dependency) deferred until the user actually visits a charting view. CSS was also automatically code-split by Vite alongside the route chunks.

---

## Phase 9 — Service Worker / Offline Support

Real-world mobile use case: opening the app at a doctor's office on flaky cellular and needing to reference recent visits, allergies, growth measurements. Pre-Phase-9 the app was a hard-fail on offline — no shell, no data. Phase 9 makes it a proper installable PWA with offline-readable cached data.

### Decisions
- **Plugin path**: `vite-plugin-pwa` (Workbox-based) over hand-rolled SW. Auto-precache manifest, automatic chunk revisions, well-maintained.
- **Offline data scope**: read-only GETs for core entities (`children`, `visits`, `illnesses`, `measurements`, `families`) via stale-while-revalidate. Mutations require connectivity (no Background Sync this round — adds significant complexity for marginal value).
- **Update behavior**: silent auto-update on next nav (`registerType: 'autoUpdate'`, `skipWaiting: true`, `clientsClaim: true`). No "Reload to update" toast.

### Configuration
**`vite.config.ts`** — added `VitePWA` plugin alongside `react()`. Key options:
- `registerType: 'autoUpdate'` + `injectRegister: 'auto'` — plugin injects `<link rel="manifest">` and `<script src="/registerSW.js">` into `index.html`.
- `manifest: {...}` — full PWA manifest defined inline (replaces the static `public/manifest.webmanifest`, which was deleted to avoid drift).
- `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}']` — precache the entire app shell including all route + vendor chunks.
- `workbox.maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` — accommodate the `vendor-recharts` chunk (383 KB) which exceeds Workbox's 2 MB default.
- `workbox.navigateFallback: '/index.html'` + `navigateFallbackDenylist: [/^\/api\//]` — SPA deep-links work offline; API requests bypass the fallback.
- `workbox.cleanupOutdatedCaches: true` — old precache entries are pruned on activation.

**Runtime caching strategies:**
- `api-core-entities` — `StaleWhileRevalidate`, matches `GET /api/(children|visits|illnesses|measurements|families)`, 200 entries, 7-day expiration. Instant offline read; fresh fetch in background.
- `api-images` — `CacheFirst`, matches `GET /api/(avatars|attachments)/*`, 300 entries, 30-day expiration. Avatars/attachments are immutable per ID, so cache-first is safe.
- `cacheableResponse: { statuses: [0, 200] }` for both — `0` accepts opaque CDN responses where applicable.

**`devOptions: { enabled: false }`** — SW disabled in dev to avoid HMR cache surprises.

### Files touched
- `vite.config.ts` — added `VitePWA(...)` plugin.
- `package.json` — added `vite-plugin-pwa` dev dep.
- `index.html` — removed static `<link rel="manifest" href="/manifest.webmanifest" />`. The plugin auto-injects the (versioned) tag along with the SW registration script.
- `public/manifest.webmanifest` — deleted (now generated by the plugin from `vite.config.ts`).
- `src/shared/hooks/useOnlineStatus.ts` — new hook tracking `navigator.onLine` via `online`/`offline` window events.
- `src/shared/hooks/index.ts` — export `useOnlineStatus`.
- `src/shared/components/OfflineIndicator.tsx` — banner component shown only when `useOnlineStatus()` returns `false`. Uses `role="status"` + `aria-live="polite"`.
- `src/shared/components/OfflineIndicator.module.css` — sticky-top warning banner with `env(safe-area-inset-top)` for iOS notch, slide-in animation gated on `prefers-reduced-motion`, smaller font on mobile.
- `src/app/components/Layout.tsx` — render `<OfflineIndicator />` as the first child of the authenticated container. Public pages (`/login`, `/register`, etc.) don't show it.

### Generated output (`dist/`)
- `sw.js` + `sw.js.map` — generated service worker.
- `workbox-9f37a4e8.js` + sourcemap — Workbox runtime.
- `registerSW.js` — auto-injected SW registration helper.
- `manifest.webmanifest` — generated PWA manifest.
- **74 precache entries totalling 1,591.91 KiB** covering every JS/CSS chunk, the icon, and `index.html`.

### Verification
- `tsc --noEmit`: clean
- `vitest run`: 26/26
- `vite build`: succeeds with PWA artifacts emitted; chunk sizes unchanged from Phase 8.
- Confirmed in `dist/sw.js`: `precacheAndRoute([...74 entries])`, `NavigationRoute` with `/api/` denylist, `StaleWhileRevalidate` route for `api-core-entities`, `CacheFirst` route for `api-images`, `cleanupOutdatedCaches`, `skipWaiting`, `clientsClaim`.

### What works offline
- App shell (HTML, all JS/CSS chunks, fonts, icons) — full UI loads.
- Recently-visited Children, Visits, Illnesses, Measurements, Families pages — reads served from cache, updated on reconnect.
- Avatars and attachment images already loaded once.
- Deep-links (`/children/:id`, `/visits/:id`, etc.) — SPA fallback to `index.html` resolves the route.
- Visible "You're offline" banner so the user knows mutations won't persist.

### What doesn't work offline (deliberate)
- Mutations (POST/PUT/DELETE) — return network errors; user sees existing error UI. No queue-and-replay.
- Auth refresh / login — requires server.
- Admin endpoints, exports, OAuth flows.
- First visit to a never-seen entity — no cache to fall back to.

### Future expansions (not in this phase)
- Background Sync for queued mutations (offline visit logging, illness day-tap, etc.).
- IndexedDB-backed structured cache for richer offline querying (vs. Workbox's per-URL response cache).
- Push notifications for upcoming visits.
- Periodic background sync to refresh recent entities while the app is closed.

---


**Last Updated**: April 26, 2026
