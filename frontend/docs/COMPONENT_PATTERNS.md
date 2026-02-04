# Component Pattern Guide

Established patterns for building components in the Trajectory frontend.

---

## **Table of Contents**
1. [Component Structure](#component-structure)
2. [Styling Patterns](#styling-patterns)
3. [Props & TypeScript](#props--typescript)
4. [State Management](#state-management)
5. [Common Patterns](#common-patterns)
6. [Testing](#testing)
7. [Anti-Patterns](#anti-patterns)

---

## **Component Structure**

### Standard Component Template
```tsx
import { ReactNode } from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

function ComponentName({ 
  children, 
  variant = 'primary', 
  className = '',
  ...rest 
}: ComponentNameProps) {
  return (
    <div 
      className={[styles.root, styles[variant], className]
        .filter(Boolean)
        .join(' ')} 
      {...rest}
    >
      {children}
    </div>
  );
}

export default ComponentName;
```

### Key Principles
- **One component per file** (except tightly coupled helpers)
- **Colocate CSS modules** with components
- **Export as default** for components
- **Use named exports** for utilities/types

---

## **Styling Patterns**

### CSS Modules (Required)
```tsx
// ✅ GOOD
import styles from './Button.module.css';

<button className={styles.primary}>Save</button>
```

```tsx
// ❌ BAD - No inline styles for theming
<button style={{ background: '#2563eb' }}>Save</button>
```

### Combining Classes
```tsx
// ✅ GOOD - Array + filter + join
const className = [
  styles.root,
  styles[variant],
  fullWidth && styles.fullWidth,
  className
].filter(Boolean).join(' ');
```

```tsx
// ❌ BAD - String concatenation
const className = styles.root + ' ' + styles[variant];
```

### CSS Variables
Always use CSS variables from `src/shared/styles/tokens.css`:
```css
/* ✅ GOOD */
.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}

/* ❌ BAD - Hardcoded values */
.button {
  background: #2563eb;
  padding: 16px;
  border-radius: 8px;
}
```

### Dark Mode
Components automatically get dark mode through CSS variables. Only add explicit dark mode rules when needed:
```css
/* Usually not needed - CSS variables handle it */
[data-theme="dark"] .component {
  /* Only if component needs special dark mode adjustment */
}
```

---

## **Props & TypeScript**

### Prop Interfaces
```tsx
// ✅ GOOD - Extend HTML element props
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

// ✅ GOOD - Compose prop types
interface BaseProps {
  label: string;
  error?: string;
}

interface InputProps extends BaseProps {
  type: 'text' | 'email';
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}
```

### Optional vs Required
```tsx
// ✅ GOOD - Explicit optionality
interface FormFieldProps {
  label: string;           // required
  error?: string;          // optional
  required?: boolean;      // optional with default
  hint?: string;           // optional
}

function FormField({ 
  label, 
  error, 
  required = false,  // default value
  hint 
}: FormFieldProps) {
  // ...
}
```

### Event Handlers
```tsx
// ✅ GOOD - Specific event types
onChange: (e: ChangeEvent<HTMLInputElement>) => void;
onClick: (e: MouseEvent<HTMLButtonElement>) => void;
onSubmit: (e: FormEvent<HTMLFormElement>) => void;

// ❌ BAD - Generic 'any'
onChange: (e: any) => void;
```

---

## **State Management**

### Local State
Use `useState` for component-local state:
```tsx
function Component() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  return (
    <button onClick={() => setIsOpen(true)}>Open</button>
  );
}
```

### Form State
Use the `useFormState` hook pattern for complex forms:
```tsx
const { formData, errors, handleChange, handleSubmit } = useFormState({
  initialData: { name: '', email: '' },
  onSubmit: async (data) => {
    await api.submit(data);
  },
});
```

### Context
Use contexts for cross-cutting concerns:
- `useAuth()` - Authentication state
- `useTheme()` - Theme/dark mode
- `usePreferences()` - User preferences
- `useFamilyPermissions()` - Permission checks

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const { user, logout } = useAuth();
  
  return <div>Hello, {user?.username}</div>;
}
```

---

## **Common Patterns**

### Conditional Rendering
```tsx
// ✅ GOOD - Explicit conditions
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage message={error} />}
{data && <DataDisplay data={data} />}

// ✅ GOOD - Ternary for either/or
{isEditing ? <EditForm /> : <DisplayView />}

// ❌ BAD - Complex nested ternaries
{isLoading ? <Spinner /> : data ? <Display /> : error ? <Error /> : null}
```

### Lists & Keys
```tsx
// ✅ GOOD - Stable keys
{items.map((item) => (
  <ListItem key={item.id} data={item} />
))}

// ❌ BAD - Index as key (unstable)
{items.map((item, index) => (
  <ListItem key={index} data={item} />
))}
```

### Async Operations
```tsx
// ✅ GOOD - Loading, error, success states
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  setLoading(true);
  setError(null);
  
  try {
    await api.submit(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed');
  } finally {
    setLoading(false);
  }
};
```

### Custom Hooks
Extract reusable logic into custom hooks:
```tsx
// src/features/visits/hooks/useVisitDetail.ts
export function useVisitDetail(visitId: number | undefined) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!visitId) return;
    loadVisit(visitId);
  }, [visitId]);
  
  const loadVisit = async (id: number) => {
    setLoading(true);
    const data = await visitsApi.getById(id);
    setVisit(data);
    setLoading(false);
  };
  
  return { visit, loading, refresh: loadVisit };
}
```

---

## **Testing**

### Test File Location
Colocate tests with components in `__tests__` folder:
```
src/shared/components/
  Button.tsx
  Button.module.css
  __tests__/
    Button.test.tsx
```

### Basic Component Test
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button', { name: 'Click me' }))
      .toBeInTheDocument();
  });
  
  it('fires onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### What to Test
- ✅ Component renders without crashing
- ✅ Props affect rendering correctly
- ✅ Event handlers fire
- ✅ Conditional rendering logic
- ✅ Accessibility (ARIA, roles, labels)
- ❌ Don't test implementation details
- ❌ Don't test CSS (visual regression tests separate)

---

## **Anti-Patterns**

### ❌ Importing CSS Module Styles in Features
```tsx
// ❌ BAD - Don't import FormField.module.css directly
import formFieldStyles from '@shared/components/FormField.module.css';

<div className={formFieldStyles.hint}>Hint text</div>
```

```tsx
// ✅ GOOD - Use FormFieldHint helper
import { FormFieldHint } from '@shared/components/FormField';

<FormFieldHint>Hint text</FormFieldHint>
```

### ❌ Hardcoded Colors
```tsx
// ❌ BAD
<div style={{ color: '#2563eb' }}>Text</div>

// ✅ GOOD
<div className={styles.primaryText}>Text</div>

/* In CSS */
.primaryText {
  color: var(--color-primary);
}
```

### ❌ String Concatenation for Classes
```tsx
// ❌ BAD
className={styles.button + ' ' + styles.primary}

// ✅ GOOD
className={[styles.button, styles.primary].join(' ')}
```

### ❌ Prop Drilling
```tsx
// ❌ BAD - Passing props through 3+ levels
<ParentComponent userId={userId}>
  <MiddleComponent userId={userId}>
    <ChildComponent userId={userId} />
  </MiddleComponent>
</ParentComponent>

// ✅ GOOD - Use context for deeply nested data
const { user } = useAuth(); // Available anywhere
```

### ❌ Large Components
```tsx
// ❌ BAD - 500+ line component doing everything
function MassiveComponent() {
  // 50 lines of state
  // 200 lines of handlers
  // 250 lines of JSX
}

// ✅ GOOD - Extract hooks, helpers, sub-components
function WellStructuredComponent() {
  const { data, loading } = useComponentData();
  
  if (loading) return <LoadingSpinner />;
  return <DataDisplay data={data} />;
}
```

---

## **File Organization**

### Feature Structure
```
src/features/visits/
  pages/
    VisitDetailPage.tsx
    AddVisitPage.tsx
  components/
    VisitCard.tsx
    VisitTimeline.tsx
  hooks/
    useVisitDetail.ts
    index.ts
  lib/
    visit-helpers.ts
    visit-form-helpers.ts
    index.ts
  index.ts  (exports public API)
```

### Shared Structure
```
src/shared/
  components/
    Button.tsx
    Button.module.css
    FormField.tsx
    FormField.module.css
    __tests__/
      Button.test.tsx
      FormField.test.tsx
  styles/
    tokens.css
    reset.css
    base.css
  lib/
    api-client.ts
    date-utils.ts
  types/
    api.ts
```

---

## **Accessibility**

### ARIA Labels
```tsx
// ✅ GOOD
<button aria-label="Close dialog" onClick={onClose}>
  ×
</button>

<input 
  aria-describedby="email-hint" 
  type="email" 
/>
<div id="email-hint">We'll never share your email</div>
```

### Semantic HTML
```tsx
// ✅ GOOD - Use semantic elements
<nav>
  <ul>
    <li><a href="/home">Home</a></li>
  </ul>
</nav>

// ❌ BAD - Div soup
<div>
  <div>
    <div onClick={goHome}>Home</div>
  </div>
</div>
```

### Keyboard Navigation
```tsx
// ✅ GOOD - Interactive elements are keyboard accessible
<button onClick={handleClick}>Click</button>
<a href="/page">Link</a>

// ❌ BAD - Div with onClick (not keyboard accessible)
<div onClick={handleClick}>Click</div>
```

---

## **Performance**

### Memoization
```tsx
// ✅ Use when appropriate
const expensiveValue = useMemo(() => 
  computeExpensiveValue(data), 
  [data]
);

const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ❌ Don't over-optimize
const simpleValue = useMemo(() => count * 2, [count]); // Overkill
```

### Lazy Loading
```tsx
// ✅ GOOD - Code-split routes
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

<Suspense fallback={<LoadingSpinner />}>
  <SettingsPage />
</Suspense>
```

---

## **Quick Reference**

| Pattern | Tool/Approach |
|---------|---------------|
| **Styling** | CSS Modules + CSS variables |
| **State** | useState, useReducer, Context |
| **Forms** | useFormState hook |
| **API** | api-client with async/await |
| **Routing** | react-router-dom |
| **Testing** | Vitest + Testing Library |
| **Types** | TypeScript interfaces |
| **Dates** | date-fns |
| **Icons** | react-icons |

---

## **Resources**

- **CSS Architecture:** `frontend/CSS_ARCHITECTURE.md`
- **Design Tokens:** `frontend/src/shared/styles/tokens.css`
- **API Types:** `frontend/src/shared/types/api.ts`
- **Test Examples:** `frontend/src/shared/components/__tests__/`

---

**Last Updated:** February 3, 2026
