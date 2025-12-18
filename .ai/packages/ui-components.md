# @my-girok/ui-components

> Shared React 19 components with WCAG 2.1 AAA compliance

## Purpose

Reusable UI components for React applications in the monorepo. All components meet WCAG 2.1 AAA standards (7:1+ contrast) with 44px+ touch targets, focus-visible keyboard navigation, and tracking-wide letter-spacing for readability.

## Structure

```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx           # Badge, SectionBadge (Editorial)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── MenuCard.tsx        # Editorial 40px card (NEW)
│   │   ├── MenuRow.tsx         # Editorial list row (NEW)
│   │   ├── PageContainer.tsx
│   │   ├── PageHeader.tsx
│   │   ├── PageLayout.tsx      # Editorial layout (NEW)
│   │   ├── SectionHeader.tsx
│   │   ├── SelectInput.tsx
│   │   ├── SortableItem.tsx
│   │   ├── SortableList.tsx
│   │   ├── TextArea.tsx
│   │   ├── TextInput.tsx
│   │   ├── ViewToggle.tsx      # Grid/List toggle (NEW)
│   │   └── index.ts
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
import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';  // All meet 44px+ touch target
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;  // React 19 ref-as-prop
}

// Usage
<Button variant="primary" size="lg" loading={isSubmitting}>
  Submit
</Button>
```

**WCAG Features**:

- All sizes meet 44x44px minimum touch target
- `focus-visible` ring for keyboard navigation
- Disabled state with proper opacity

### TextInput

```typescript
import { InputHTMLAttributes, Ref } from 'react';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;  // React 19 ref-as-prop
}

// Usage
<TextInput
  label="Email Address"
  type="email"
  value={email}
  onChange={setEmail}
  error={errors.email}
  required
/>
```

**WCAG Features**:

- `min-h-[48px]` for touch target
- `aria-invalid`, `aria-describedby`, `aria-required`
- `focus-visible` ring for keyboard navigation
- `sr-only` text for required field screen readers

### TextArea

```typescript
import { TextareaHTMLAttributes, Ref } from 'react';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  onChange?: (value: string) => void;
  ref?: Ref<HTMLTextAreaElement>;  // React 19 ref-as-prop
}

// Usage
<TextArea
  label="Description"
  value={description}
  onChange={setDescription}
  rows={4}
  required
/>
```

**WCAG Features**:

- `min-h-[120px]` for adequate space
- Same accessibility as TextInput

### SelectInput

```typescript
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;  // React 19 ref-as-prop
}

// Usage
<SelectInput
  label="Degree"
  options={[
    { value: 'bachelor', label: "Bachelor's" },
    { value: 'master', label: "Master's" },
  ]}
  value={degree}
  onChange={setDegree}
  placeholder="Select degree"
/>
```

**WCAG Features**:

- `min-h-[48px]` for touch target
- Same accessibility as TextInput

### Alert

```typescript
export interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

// Usage
<Alert variant="error" onClose={() => setError(null)}>
  {errorMessage}
</Alert>
```

**WCAG Features**:

- 44x44px close button touch target
- `focus-visible` ring on close button

### Card

```typescript
export interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'responsive';
  radius?: 'default' | 'lg';  // 'lg' = 36px for menu cards
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

// Usage
<Card variant="primary" interactive radius="lg" onClick={handleClick}>
  <h2>Card Title</h2>
</Card>
```

**WCAG Features**:

- Keyboard navigation (Enter/Space for interactive)
- `focus-visible` ring
- `role="button"` and `tabIndex={0}` for interactive cards

## Editorial Components (Modern Editorial Archive Style)

> "Sophisticated Classic" design pattern with serif titles, 40px radius, and editorial typography

### MenuCard

Large navigation card with index number and hover lift effect.

```typescript
export interface MenuCardProps {
  index: number;           // Display index (01, 02, etc.)
  icon: React.ReactNode;   // Lucide icon
  title: string;           // Serif font title
  description: string;
  onClick?: () => void;    // undefined = disabled
  'aria-label'?: string;
}

// Usage
<MenuCard
  index={1}
  icon={<Book className="w-6 h-6" />}
  title="Personal Journal"
  description="Record your daily thoughts"
  onClick={() => navigate('/journal')}
/>
```

**Features**: 40px radius, hover translateY(-4px), semantic `<button>`, Playfair Display serif

### MenuRow

Compact list row for list view mode.

```typescript
export interface MenuRowProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  'aria-label'?: string;
}

// Usage
<MenuRow
  index={1}
  icon={<Book className="w-5 h-5" />}
  title="Personal Journal"
  onClick={() => navigate('/journal')}
/>
```

### ViewToggle

Grid/List view mode toggle with radiogroup semantics.

```typescript
export type ViewMode = 'grid' | 'list';

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

// Usage
const [viewMode, setViewMode] = useState<ViewMode>('grid');
<ViewToggle value={viewMode} onChange={setViewMode} />
```

**WCAG Features**: `role="radiogroup"`, `aria-checked`, 44px touch targets

### Badge / SectionBadge

```typescript
// Badge - Status indicators
<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Pending</Badge>

// SectionBadge - Editorial section headers
<SectionBadge>MY ARCHIVE</SectionBadge>
```

**Variants**: default, success, warning, error, info, accent

### PageLayout / PageSection

Editorial page layout with 80px nav offset.

```typescript
<PageLayout maxWidth="5xl">
  <PageSection badge="MY ARCHIVE" title="Dashboard" actions={<ViewToggle />}>
    <div className="grid grid-cols-2 gap-6">...</div>
  </PageSection>
</PageLayout>
```

**Features**: Playfair Display serif titles, monospace badges, max-w-5xl default

### SortableList (DnD Kit)

```typescript
export interface SortableListProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}

// Usage
<SortableList
  items={skills}
  getItemId={(skill) => skill.id}
  onReorder={setSkills}
  renderItem={(skill) => (
    <SortableItem key={skill.id} id={skill.id} useDragHandle>
      {skill.name}
    </SortableItem>
  )}
/>
```

**Accessibility**:

- Keyboard drag with KeyboardSensor
- Touch support with delay (200ms) to prevent scroll hijacking

## Hooks

### useAsyncOperation

```typescript
export interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  defaultErrorMessage?: string;
}

export interface UseAsyncOperationResult<T> {
  execute: (operation: () => Promise<T>) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  data: T | null;
  reset: () => void;
}

// Usage
const { execute, loading, error } = useAsyncOperation({
  onSuccess: () => navigate('/dashboard'),
});

await execute(() => api.createPost(data));
```

### useDebounce

```typescript
// Usage
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

## Theme Tokens

Components use semantic theme tokens from `@my-girok/design-tokens`:

| Token                                 | Usage                |
| ------------------------------------- | -------------------- |
| `bg-theme-bg-page`                    | Page background      |
| `bg-theme-bg-card`                    | Card background      |
| `bg-theme-bg-input`                   | Input background     |
| `bg-theme-bg-hover`                   | Hover states         |
| `text-theme-text-primary`             | Primary text         |
| `text-theme-text-secondary`           | Secondary text       |
| `text-theme-text-muted`               | Placeholder text     |
| `border-theme-border-default`         | Default borders      |
| `border-theme-border-subtle`          | Subtle borders       |
| `text-theme-primary`                  | Primary accent color |
| `bg-theme-status-error-bg`            | Error backgrounds    |
| `text-theme-status-error-text`        | Error text           |
| `focus-visible:ring-theme-focus-ring` | Focus ring           |

## Usage

```typescript
import {
  Button,
  TextInput,
  TextArea,
  SelectInput,
  Alert,
  Card,
  SortableList,
  SortableItem,
  useAsyncOperation,
  useDebounce,
} from '@my-girok/ui-components';
```

## Installation

```bash
# In monorepo - automatically available via workspace
pnpm install

# For drag-and-drop features
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Dependencies

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@my-girok/design-tokens": "workspace:*"
  },
  "dependencies": {
    "@dnd-kit/core": "catalog:",
    "@dnd-kit/sortable": "catalog:",
    "@dnd-kit/utilities": "catalog:"
  }
}
```

## React 19 Compatibility

All components use **ref-as-prop** pattern (not forwardRef):

```typescript
// React 19 pattern (current)
export function Button({ ref, ...props }: ButtonProps) {
  return <button ref={ref} {...props} />;
}

// Old forwardRef pattern (deprecated)
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <button ref={ref} {...props} />;
});
```
