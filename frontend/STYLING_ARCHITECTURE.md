# Styling Architecture Guide

**Goal:** Document the styling system, CSS patterns, and design decisions for the Trajectory frontend.

---

## **Table of Contents**

1. [Overview](#overview)
2. [CSS Modules](#css-modules)
3. [Color & Theme System](#color--theme-system)
4. [Layout & Spacing](#layout--spacing)
5. [Responsive Design](#responsive-design)
6. [Dark Mode](#dark-mode)
7. [Common Patterns](#common-patterns)

---

## **Overview**

### **Technology Stack**

- **CSS Modules** - Component-scoped styling
- **CSS Custom Properties (Variables)** - Global theme colors and values
- **No Tailwind/Bootstrap** - Hand-crafted styles for precise control
- **Vite** - CSS processing and bundling

### **Key Principles**

1. **Scoped by Default** - CSS Modules prevent style leaks
2. **Semantic HTML** - Styling follows structure, not vice versa
3. **Dark Mode First** - All components support light and dark themes
4. **Mobile-First** - Responsive design starts from mobile
5. **Performance** - Minimal CSS, critical styles inline

---

## **CSS Modules**

### **File Structure**

```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.module.css
├── pages/
│   └── HomePage/
│       ├── HomePage.tsx
│       └── HomePage.module.css
└── styles/
    ├── variables.css
    ├── global.css
    └── [feature].module.css
```

### **Basic Module Pattern**

```css
/* Button.module.css */
.root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2) var(--spacing-3);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.root:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.primary:active {
  transform: translateY(0);
}

.secondary {
  background: var(--color-secondary);
  color: var(--color-on-secondary);
  border: 1px solid var(--color-border);
}
```

### **Naming Conventions**

```css
/* ✅ GOOD - Descriptive, hierarchical */
.root { }
.root:hover { }
.header { }
.title { }
.content { }
.footer { }

/* ❌ BAD - Non-semantic, unclear purpose */
.item { }
.box { }
.text { }
.flex { }
```

### **Usage in Components**

```tsx
import styles from './Button.module.css';

function Button({ variant = 'primary' }) {
  return (
    <button className={styles.root + ' ' + styles[variant]}>
      Click me
    </button>
  );
}
```

**Better with array pattern:**

```tsx
const className = [
  styles.root,
  variant && styles[variant],
  disabled && styles.disabled,
  className, // custom class passed via props
].filter(Boolean).join(' ');

return <button className={className}>{children}</button>;
```

---

## **Color & Theme System**

### **CSS Variables (Theme)**

**Location:** `src/styles/variables.css`

```css
:root {
  /* Primary Brand */
  --color-primary: #2563eb;
  --color-primary-light: #3b82f6;
  --color-primary-dark: #1e40af;
  --color-on-primary: #ffffff;

  /* Secondary */
  --color-secondary: #10b981;
  --color-secondary-light: #34d399;
  --color-secondary-dark: #059669;
  --color-on-secondary: #ffffff;

  /* Semantic Colors */
  --color-success: #10b981;
  --color-success-bg: #ecfdf5;
  --color-success-text: #065f46;

  --color-error: #ef4444;
  --color-error-bg: #fef2f2;
  --color-error-text: #7f1d1d;

  --color-warning: #f59e0b;
  --color-warning-bg: #fffbeb;
  --color-warning-text: #78350f;

  --color-info: #3b82f6;
  --color-info-bg: #eff6ff;
  --color-info-text: #1e3a8a;

  /* Neutral */
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;

  /* Dark Mode */
  --color-background-dark: #1f2937;
  --color-surface-dark: #111827;
  --color-border-dark: #374151;
  --color-text-dark: #f3f4f6;
  --color-text-secondary-dark: #d1d5db;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-background-dark);
    --color-surface: var(--color-surface-dark);
    --color-border: var(--color-border-dark);
    --color-text: var(--color-text-dark);
    --color-text-secondary: var(--color-text-secondary-dark);
  }
}
```

### **Using Colors in Components**

```css
/* ✅ GOOD - Use variables */
.button {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

/* ❌ BAD - Hardcoded colors */
.button {
  background: #2563eb;
  color: #ffffff;
}
```

---

## **Layout & Spacing**

### **Spacing Scale**

```css
:root {
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-12: 3rem;    /* 48px */
  --spacing-16: 4rem;    /* 64px */
}
```

### **Layout Utilities (Module)**

**File:** `src/styles/layout.module.css`

```css
.pageContainer {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.flex {
  display: flex;
}

.flexColumn {
  display: flex;
  flex-direction: column;
}

.gap {
  gap: var(--spacing-4);
}

.gapLarge {
  gap: var(--spacing-6);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-4);
}
```

### **Usage**

```tsx
import layoutStyles from '@shared/styles/layout.module.css';

function Page() {
  return (
    <div className={layoutStyles.pageContainer}>
      <div className={[layoutStyles.grid].join(' ')}>
        {/* Cards */}
      </div>
    </div>
  );
}
```

---

## **Responsive Design**

### **Mobile-First Approach**

```css
/* Mobile first (default) */
.card {
  padding: var(--spacing-4);
  font-size: 14px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .card {
    padding: var(--spacing-6);
    font-size: 16px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .card {
    padding: var(--spacing-8);
  }
}
```

### **Breakpoints**

```css
:root {
  /* Mobile: default */
  /* Tablet: 640px and up */
  /* Desktop: 1024px and up */
  /* Large: 1280px and up */
}
```

### **Using Breakpoints**

```css
/* ✅ GOOD - Using media queries */
.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-4);
}

@media (min-width: 768px) {
  .layout {
    grid-template-columns: 1fr 2fr;
    gap: var(--spacing-6);
  }
}
```

---

## **Dark Mode**

### **Implementation**

Dark mode uses CSS media query `prefers-color-scheme: dark`:

```css
/* Light mode (default) */
.card {
  background: var(--color-background);
  color: var(--color-text);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .card {
    background: var(--color-surface-dark);
    color: var(--color-text-dark);
  }
}
```

### **Best Practices**

1. **Use CSS Variables** - All colors should be variables that change with theme
2. **Test Both Modes** - Always verify components look good in both themes
3. **Sufficient Contrast** - Ensure WCAG AA contrast ratios in both modes
4. **Respect User Preference** - Use system preference by default, allow override

### **Testing Dark Mode**

In browser DevTools:
1. Open DevTools
2. Cmd/Ctrl + Shift + P → "Rendering"
3. Select "prefers-color-scheme: dark"

---

## **Common Patterns**

### **Card Component**

```css
/* Card.module.css */
.root {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.root:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  .root {
    background: var(--color-surface-dark);
    border-color: var(--color-border-dark);
  }
}
```

### **Form Group**

```css
.formGroup {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.label {
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text);
}

.input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--color-background);
  color: var(--color-text);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

### **Sidebar Layout**

```css
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-6);
  min-height: 100vh;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }
}
```

---

## **Performance Tips**

1. **Minimize CSS** - Remove unused styles in production
2. **Use CSS Variables** - Easier to maintain than hardcoded values
3. **Avoid Expensive Properties** - `box-shadow`, `filter` impact performance
4. **Critical CSS** - Inline essential styles for above-the-fold content
5. **Bundle Analysis** - Monitor CSS file sizes in build

---

## **Resources**

- [MDN CSS Modules](https://github.com/css-modules/css-modules)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WCAG Color Contrast](https://webaim.org/articles/contrast/)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
