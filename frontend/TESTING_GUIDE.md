# Testing Guide

**Goal:** Document testing strategies and best practices for the Trajectory frontend application.

---

## **Table of Contents**

1. [Overview](#overview)
2. [Testing Types](#testing-types)
3. [Manual Testing Flows](#manual-testing-flows)
4. [Component Testing Patterns](#component-testing-patterns)
5. [Debugging Tips](#debugging-tips)
6. [Common Issues & Solutions](#common-issues--solutions)

---

## **Overview**

### **Testing Strategy**

The Trajectory frontend uses:

- **Manual Testing** - Critical user flows tested in development
- **Type Safety** - TypeScript catches many bugs at compile time (0 errors!)
- **Build Verification** - Ensures no regressions with each build
- **Browser Testing** - Cross-browser compatibility verification

### **Setup**

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build
npm run build

# Type check without building
npx tsc --noEmit
```

---

## **Testing Types**

### **1. Manual User Flow Testing**

**When:** Before commits, after major changes, before releases

**Tools:**
- Browser DevTools (Console, Network, Elements)
- Mobile device preview
- Multiple browsers (Chrome, Safari, Firefox)

**Process:**
1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Walk through each user flow
4. Check console for errors
5. Test on mobile viewport
6. Test with screen reader (for accessibility)

### **2. Type Checking**

**When:** Continuously during development, in CI/CD pipeline

**Command:**
```bash
npx tsc --noEmit
```

**What it catches:**
- Missing prop types
- Incorrect prop types
- Undefined variables
- Wrong function parameters
- Type mismatches

### **3. Build Verification**

**When:** Before pushing to remote, before merging PRs

**Command:**
```bash
npm run build
```

**What it checks:**
- TypeScript compilation
- Module bundling
- Import resolution
- Asset optimization
- Output file sizes

**Expected output:**
```
✓ 1081 modules transformed
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-D75T94mc.css  195.85 kB │ gzip:  29.90 kB
dist/assets/index-N-F3bXNa.js   938.39 kB │ gzip: 262.57 kB
✓ built in 2.30s
```

### **4. Component Inspection**

**Using React DevTools:**
1. Install [React DevTools Extension](https://react-devtools-tutorial.vercel.app/)
2. Open DevTools → Components tab
3. Inspect component props and state
4. Check for unnecessary re-renders

**Using Browser DevTools:**
1. Open DevTools → Elements/Inspector
2. Find component in DOM
3. Check applied styles (CSS Modules)
4. Verify computed styles

---

## **Manual Testing Flows**

### **Flow 1: Add a Child**

**Steps:**
1. Go to Home page
2. Click "Add Child" button
3. Fill form:
   - Name
   - Date of Birth
   - (Optional) Photo
4. Click "Save"
5. Verify child appears in family list
6. Check URL navigated back to home

**Expected:**
- ✅ Child saved in database
- ✅ Avatar uploaded (if provided)
- ✅ Appears immediately in sidebar
- ✅ No console errors

**Common issues:**
- Date picker not opening → Check browser version
- Avatar not uploading → Check file size (< 5MB), format (jpg/png)

---

### **Flow 2: Create a Visit**

**Steps:**
1. Go to Visits tab
2. Click "Add Visit" button
3. Select child (if not pre-selected)
4. Select visit type (wellness, sick, injury, etc.)
5. Fill form fields:
   - Date (should default to today)
   - Doctor/Location info
   - Measurements (weight, height, etc.)
   - Additional details based on visit type
6. Add attachment (optional)
7. Click "Save"
8. Verify visit appears in timeline

**Expected:**
- ✅ Form validation works (required fields)
- ✅ Date picker works
- ✅ Attachments upload successfully
- ✅ Visit appears in child's visit list
- ✅ Metrics update if applicable

**Common issues:**
- Form submission stuck → Check console for API errors
- Validation errors unclear → Should show inline error messages
- Attachment upload fails → Check file size, network

---

### **Flow 3: Edit a Visit**

**Steps:**
1. Navigate to a visit from timeline or visits list
2. Click "Edit" button (or pencil icon)
3. Modify fields
4. Click "Save"
5. Verify changes appear

**Expected:**
- ✅ Form pre-fills with current data
- ✅ Changes save immediately
- ✅ Return to visit detail view
- ✅ Changes reflected in timeline

**Test different edit scenarios:**
- Add measurement to wellness visit
- Change visit date
- Add/remove attachments
- Update notes

---

### **Flow 4: Manage Illnesses**

**Steps:**
1. Go to Illness tab
2. Create a new illness:
   - Type (viral, bacterial, allergic, etc.)
   - Start date
   - Notes
3. Mark as resolved
4. View illness history
5. Add symptoms/notes during illness

**Expected:**
- ✅ Illness appears in timeline
- ✅ Can track duration
- ✅ Linked to any related visits
- ✅ Can update status

---

### **Flow 5: View Metrics & Trends**

**Steps:**
1. Go to Trends tab
2. Select metric (Weight, Height, BMI)
3. Select mode (Value or Percentile)
4. View chart
5. Switch children
6. Switch metric

**Expected:**
- ✅ Charts render without errors
- ✅ Data points appear correctly
- ✅ Tooltip shows on hover
- ✅ Responsive on mobile
- ✅ No console errors

**Test data:**
- Chart with single data point
- Chart with many data points
- Chart with no data
- Chart with multi-child view

---

### **Flow 6: Dark Mode Toggle**

**Steps:**
1. Open DevTools
2. Run in DevTools:
   ```javascript
   // Force dark mode
   document.documentElement.style.colorScheme = 'dark';
   ```
3. Verify all components look good
4. Check contrast ratios are sufficient
5. Toggle back to light mode

**Expected:**
- ✅ All text readable
- ✅ Colors change appropriately
- ✅ Borders/shadows visible
- ✅ No color/contrast issues

---

### **Flow 7: Responsive Design**

**Steps:**
1. Open DevTools
2. Toggle device toolbar
3. Test viewport sizes:
   - Mobile (375px - iPhone SE)
   - Tablet (768px - iPad)
   - Desktop (1024px+)
4. Test interactions on each size

**Expected:**
- ✅ Layout adapts smoothly
- ✅ Touch targets large enough (44px+)
- ✅ No horizontal scroll
- ✅ Forms remain usable
- ✅ Sidebars collapse on mobile

---

## **Component Testing Patterns**

### **Testing Hooks (useChildren, useVisits, etc.)**

**Setup:**
```tsx
import { useChildren } from '@features/children/hooks';

function TestComponent() {
  const { children, loading, error } = useChildren();
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {children && <p>{children.length} children</p>}
    </div>
  );
}
```

**Manual test:**
1. Render component in dev server
2. Check initial loading state
3. Verify data loads
4. Test error state (disconnect network)
5. Test reload functionality

### **Testing Forms**

**Test validation:**
```tsx
// Try submitting without filling required fields
// Should show error messages
```

**Test inputs:**
```tsx
// Type in each field
// Should update state
// Clear field - should accept empty value
```

**Test date picker:**
```tsx
// Click date field
// Select various dates
// Should handle past dates (visits, births)
// Should handle future dates (appointments)
```

### **Testing Lists & Tables**

**Test rendering:**
```tsx
// Empty state - should show "No items"
// Single item - should display correctly
// Many items - should handle pagination/scrolling
```

**Test interactions:**
```tsx
// Click row - should navigate
// Click action button - should trigger action
// Search/filter - should update list
```

---

## **Debugging Tips**

### **1. Check Browser Console**

```javascript
// Should be clean (no red errors)
// Warnings are OK but investigate
// TypeScript errors should be 0
```

**Command in terminal:**
```bash
npx tsc --noEmit
```

### **2. Use React DevTools**

1. Install React DevTools Chrome extension
2. Open DevTools → Components tab
3. Find your component in tree
4. Inspect props and state
5. Check for unexpected re-renders

### **3. Network Debugging**

1. Open DevTools → Network tab
2. Perform action
3. Look for failed requests (red)
4. Check request/response:
   - Status code (200 = OK, 4xx = client error, 5xx = server error)
   - Request body (what was sent)
   - Response body (what came back)

### **4. Local Storage Inspection**

```javascript
// In console:
localStorage.getItem('key');
localStorage.setItem('key', 'value');
localStorage.clear();
```

### **5. Performance Profiling**

1. DevTools → Performance tab
2. Click record
3. Perform action
4. Stop recording
5. Analyze:
   - Component render times
   - Re-renders count
   - Bottlenecks

---

## **Common Issues & Solutions**

### **Issue: Form doesn't submit**

**Diagnosis:**
1. Check console for JavaScript errors
2. Check Network tab for failed API request
3. Check form validation (any errors?)

**Solutions:**
- Verify required fields filled
- Check API server is running
- Clear browser cache and reload
- Check network connection

### **Issue: Data doesn't appear after save**

**Diagnosis:**
1. Check Network tab - did request succeed (200)?
2. Check API response - what data came back?
3. Check component state - did it update?

**Solutions:**
- Refresh page to verify data was saved
- Check browser console for errors
- Verify API response contains expected data
- Check component is listening for updates

### **Issue: Page scrolls unexpectedly**

**Diagnosis:**
1. Check for modals/overlays
2. Check CSS for `overflow: hidden` on body
3. Use DevTools to inspect scroll behavior

**Solutions:**
- Close any open modals
- Clear browser cache
- Check CSS for scroll-related properties

### **Issue: Styling broken/overlapping**

**Diagnosis:**
1. Open DevTools Elements tab
2. Find element
3. Check applied styles
4. Check for conflicting CSS

**Solutions:**
- Clear cache and rebuild: `npm run build`
- Check CSS module imports
- Verify CSS variable values
- Check for typos in class names

### **Issue: Data loads but chart doesn't show**

**Diagnosis:**
1. Check console for render errors
2. Check data structure matches expected format
3. Check data count (need at least 2 points for chart)

**Solutions:**
- Add sample data to test
- Check chart library documentation
- Verify data format with DevTools
- Test with different data ranges

---

## **Accessibility Testing**

### **Keyboard Navigation**

Test using only keyboard:
1. Tab through page - should visit all interactive elements
2. Enter/Space to activate buttons
3. Arrow keys for dropdowns/menus
4. Escape to close modals

**Expected:**
- ✅ Visible focus indicator on all elements
- ✅ Logical tab order
- ✅ No keyboard traps

### **Screen Reader Testing**

For macOS (VoiceOver):
```
Cmd + F5 to toggle
```

For Windows (Narrator):
```
Win + Ctrl + Enter
```

**Expected:**
- ✅ Page structure understood
- ✅ Form labels read correctly
- ✅ Images have alt text
- ✅ Buttons/links are announced

### **Color Contrast**

Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/):
1. Pick two colors from your palette
2. Check WCAG AA compliance (4.5:1 ratio minimum)
3. Verify in both light and dark modes

---

## **Continuous Integration (CI)**

When you push to GitHub:
1. Automated tests run
2. Build is verified
3. Type checking runs
4. If all pass → Ready to merge

**To verify locally before pushing:**
```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# No errors = safe to push
```

---

## **Resources**

- [React DevTools Tutorial](https://react-devtools-tutorial.vercel.app/)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Vite Documentation](https://vitejs.dev/)
