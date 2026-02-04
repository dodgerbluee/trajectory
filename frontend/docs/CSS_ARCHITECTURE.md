# CSS Architecture & Styling Patterns

Consistent, maintainable styling across the application with dark mode support.

---

## **Color System**

### Primary Colors (CSS Variables)
```css
--color-primary:          #2563eb  /* Blue - primary actions */
--color-primary-dark:     #1e40af  /* Dark blue - hover states */
--color-secondary:        #6366f1  /* Indigo - secondary actions */
--color-success:          #10b981  /* Green - wellness, approved */
--color-warning:          #f59e0b  /* Amber - caution, illness */
--color-danger:           #ef4444  /* Red - errors, sick visits */
--color-info:             #3b82f6  /* Light blue - information */
```

### Semantic Colors
```css
--color-wellness:         var(--color-success)
--color-sick:             var(--color-danger)
--color-injury:           #ec4899  /* Pink */
--color-vision:           #8b5cf6  /* Purple */
--color-dental:           #f97316  /* Orange */
--color-illness:          var(--color-warning)
```

### Neutral Palette (Light Mode)
```css
--color-bg:               #ffffff
--color-bg-secondary:     #f8f9fa
--color-border:           #e5e7eb
--color-text-primary:     #1f2937
--color-text-secondary:   #6b7280
--color-text-muted:       #9ca3af
```

### Dark Mode Overrides
The application uses `[data-theme="dark"]` selector for dark mode. All light-mode-specific colors are automatically adjusted via CSS variables at the `:root[data-theme="dark"]` level.

```css
[data-theme="dark"] {
  --color-bg:               #1f2937
  --color-bg-secondary:     #111827
  --color-border:           #374151
  --color-text-primary:     #f3f4f6
  --color-text-secondary:   #d1d5db
}
```

---

## **Component Styling Patterns**

### 1. **Module-Scoped CSS**
All component styles use CSS Modules for scoping:
```tsx
// ✅ GOOD
import styles from './Button.module.css';

export function Button({ variant, children }) {
  return (
    <button className={styles[variant]}>
      {children}
    </button>
  );
}
```

### 2. **Conditional Styles**
Use CSS class selection for conditional styles, not inline styles:
```tsx
// ✅ GOOD - Use CSS-scoped variants
<button className={styles[variant === 'primary' ? 'primary' : 'secondary']} />

// ❌ AVOID - Inline styles
<button style={{ color: variant === 'primary' ? '#2563eb' : '#6b7280' }} />
```

### 3. **Dark Mode in CSS Modules**
Use `[data-theme="dark"]` or `:global([data-theme="dark"])` for dark mode:
```css
/* ✅ GOOD */
.button {
  background: var(--color-bg);
  color: var(--color-text-primary);
}

[data-theme="dark"] .button {
  /* Automatically uses --color-bg from dark mode variables */
}
```

### 4. **Spacing System**
Use CSS variable spacing constants:
```css
--spacing-xs:  0.25rem  /* 4px */
--spacing-sm:  0.5rem   /* 8px */
--spacing-md:  1rem     /* 16px */
--spacing-lg:  1.5rem   /* 24px */
--spacing-xl:  2rem     /* 32px */
```

### 5. **Responsive Design**
Use consistent breakpoints:
```css
/* Small screens (mobile) */
@media (max-width: 640px) { }

/* Medium screens (tablets) */
@media (min-width: 768px) { }

/* Large screens (desktop) */
@media (min-width: 1024px) { }
```

---

## **Dark Mode Checklist**

### Components with Dark Mode Support
- ✅ Card
- ✅ Button
- ✅ TimelineItem
- ✅ VisitIcons
- ✅ Layout/Header
- ✅ HomePage
- ✅ UpcomingVisitsSection

### Testing Dark Mode
1. Open DevTools → More tools → Rendering
2. Toggle "Emulate CSS media feature prefers-color-scheme"
3. Verify all components are readable and accessible
4. Check for:
   - Text contrast (4.5:1 minimum)
   - Color-only information (use patterns, not just color)
   - Proper hover/focus states

---

## **Best Practices**

### ✅ DO
- Use CSS variables for all colors, spacing, and typography
- Scope styles to components with CSS Modules
- Use semantic class names (`.button-primary`, not `.blue-button`)
- Define dark mode variants in CSS, not TypeScript
- Keep inline styles for dynamic layout only (positions, transforms)
- Test components in both light and dark modes

### ❌ DON'T
- Hard-code colors (`color: #2563eb`)
- Use string concatenation for class names (`className={styles.btn + ' ' + styles.primary}`)
- Define semantic variants in TypeScript (`variant === 'primary' ? '#2563eb' : '#6b7280'`)
- Use `!important` (if you need it, refactor)
- Mix CSS-in-JS with CSS Modules
- Forget to test dark mode

---

## **Adding a New Component**

1. **Create the component file** (`Button.tsx`)
2. **Create the style module** (`Button.module.css`)
3. **Define light mode styles** with CSS variables:
   ```css
   .button {
     background: var(--color-primary);
     color: var(--color-white);
     padding: var(--spacing-md);
   }
   ```
4. **Add dark mode rules** if needed:
   ```css
   [data-theme="dark"] .button {
     /* Uncomment only if variables need adjustment for dark mode */
     /* background: var(--color-primary-dark); */
   }
   ```
5. **Test in both modes** before merging

---

## **Migration Guide (Old → New)**

### Hard-coded colors → CSS Variables
```css
/* OLD */
.card { background: #ffffff; color: #1f2937; }

/* NEW */
.card { background: var(--color-bg); color: var(--color-text-primary); }
```

### Inline styles → CSS Modules
```tsx
/* OLD */
<div style={{ color: variant === 'danger' ? '#ef4444' : '#2563eb' }} />

/* NEW */
<div className={styles[variant]} />
/* Define .danger and .primary in CSS Module */
```

### Dark mode mixins → CSS Variables
```css
/* OLD */
.button { 
  @media (prefers-color-scheme: dark) {
    background: #374151;
    color: #f3f4f6;
  }
}

/* NEW */
.button { 
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}
[data-theme="dark"] .button {
  /* Uses --color vars already updated for dark */
}
```

---

## **Resources**

- **Color contrast checker:** https://webaim.org/resources/contrastchecker/
- **Dark mode best practices:** https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- **CSS Modules documentation:** https://github.com/css-modules/css-modules

