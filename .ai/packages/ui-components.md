# @my-girok/ui-components

> Shared React components and hooks

## Purpose

Reusable UI components and custom hooks for React applications in the monorepo. Provides consistent design system implementation across web apps.

## Structure

```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── TextInput.tsx
│   │   │   ├── SelectInput.tsx
│   │   │   └── index.ts
│   │   ├── Feedback/
│   │   │   ├── Alert.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   ├── Layout/
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   └── DragDrop/
│   │       ├── SortableList.tsx
│   │       ├── SortableItem.tsx
│   │       └── index.ts
│   ├── hooks/
│   │   ├── useAsyncOperation.ts
│   │   ├── useDebounce.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Components

### Button

```typescript
// src/components/Button/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, children, disabled, className, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses = {
      primary: 'bg-theme-accent-primary text-white hover:bg-theme-accent-primary/90 focus:ring-theme-accent-primary',
      secondary: 'bg-theme-bg-secondary text-theme-text-primary border border-theme-border-subtle hover:bg-theme-bg-tertiary',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" className="mr-2" />}
        {children}
      </button>
    );
  }
);
```

### TextInput

```typescript
// src/components/Input/TextInput.tsx
import { InputHTMLAttributes, forwardRef } from 'react';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  onChange?: (value: string) => void;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, hint, onChange, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-theme-text-primary mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 rounded-lg border bg-theme-bg-input text-theme-text-primary placeholder-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${error ? 'border-red-500' : 'border-theme-border-subtle'} ${className || ''}`}
          onChange={(e) => onChange?.(e.target.value)}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-sm text-theme-text-tertiary">{hint}</p>}
      </div>
    );
  }
);
```

### Alert

```typescript
// src/components/Feedback/Alert.tsx
import { ReactNode } from 'react';

export interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ variant, children, onClose }: AlertProps) {
  const variantClasses = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]} flex items-start justify-between`}>
      <div>{children}</div>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-current opacity-50 hover:opacity-100">
          &times;
        </button>
      )}
    </div>
  );
}
```

### SortableList (DnD Kit)

```typescript
// src/components/DragDrop/SortableList.tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export interface SortableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}

export function SortableList<T>({
  items,
  keyExtractor,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => keyExtractor(item) === active.id);
    const newIndex = items.findIndex((item) => keyExtractor(item) === over.id);

    const newItems = [...items];
    const [removed] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, removed);

    onReorder(newItems);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(keyExtractor)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item, index) => renderItem(item, index))}
      </SortableContext>
    </DndContext>
  );
}
```

## Hooks

### useAsyncOperation

```typescript
// src/hooks/useAsyncOperation.ts
import { useState, useCallback } from 'react';

export interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseAsyncOperationResult<T> {
  execute: (operation: () => Promise<T>) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  data: T | null;
  reset: () => void;
}

export function useAsyncOperation<T = unknown>(
  options?: UseAsyncOperationOptions<T>
): UseAsyncOperationResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | undefined> => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation();
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        options?.onError?.(err instanceof Error ? err : new Error(errorMessage));
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
}
```

### useDebounce

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Usage

```typescript
import {
  Button,
  TextInput,
  SelectInput,
  Alert,
  SortableList,
  SortableItem,
  useAsyncOperation,
  useDebounce,
} from '@my-girok/ui-components';

// Button variants
<Button variant="primary" onClick={handleSubmit}>Submit</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" loading={isDeleting}>Delete</Button>

// Form inputs
<TextInput
  label="Email"
  value={email}
  onChange={setEmail}
  error={errors.email}
  required
/>

// Feedback
{error && <Alert variant="error">{error}</Alert>}
{success && <Alert variant="success" onClose={() => setSuccess(false)}>Saved!</Alert>}

// Async operations
const { execute, loading, error } = useAsyncOperation({
  onSuccess: () => navigate('/dashboard'),
});

const handleSubmit = () => {
  execute(() => api.createPost(data));
};
```

## Installation

```bash
pnpm add @my-girok/ui-components --filter @my-girok/web-main
```

## Dependencies

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0"
  }
}
```

## Theme Tokens

Components use semantic theme tokens that auto-adapt to light/dark mode via `[data-theme]` attribute.

### Background Tokens

| Class | Usage |
|-------|-------|
| `bg-theme-bg-page` | Page background |
| `bg-theme-bg-card` | Card backgrounds |
| `bg-theme-bg-elevated` | Elevated surfaces |
| `bg-theme-bg-input` | Form input backgrounds |
| `bg-theme-bg-hover` | Hover states |

### Text Tokens

| Class | Usage |
|-------|-------|
| `text-theme-text-primary` | Primary text |
| `text-theme-text-secondary` | Secondary text |
| `text-theme-text-tertiary` | Muted text |
| `text-theme-primary` | Primary accent color |

### Border Tokens

| Class | Usage |
|-------|-------|
| `border-theme-border-subtle` | Subtle borders |
| `border-theme-border-default` | Default borders |
| `border-theme-border-strong` | Strong borders |

### Shadow Tokens

| Class | Usage |
|-------|-------|
| `shadow-theme-sm` | Small shadows |
| `shadow-theme-md` | Medium shadows |
| `shadow-theme-lg` | Large shadows |
| `shadow-theme-xl` | Extra large shadows |
| `shadow-theme-2xl` | 2X large shadows |
| `shadow-theme-glow` | Glowing accent effect |

### Status Color Tokens

| Class | Usage |
|-------|-------|
| `bg-theme-status-success-bg` | Success background |
| `text-theme-status-success-text` | Success text |
| `bg-theme-status-error-bg` | Error background |
| `text-theme-status-error-text` | Error text |
| `bg-theme-status-warning-bg` | Warning background |
| `text-theme-status-warning-text` | Warning text |

See `apps/web-main/src/index.css` for token definitions.
