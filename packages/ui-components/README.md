# @my-girok/ui-components

Shared UI components for my-girok frontend applications with WCAG 2.1 AA compliance.

## Overview

Reusable React 19 components with consistent theming:

- WCAG 2.1 AA compliant (4.5:1+ contrast, 44px touch targets)
- Theme tokens (`theme-*` classes) for light/dark mode
- React 19 compatible (ref as prop)

## Components

### Form Components

#### TextInput

```tsx
import { TextInput } from '@my-girok/ui-components';

<TextInput
  label="Email Address"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="you@example.com"
  error={errorMessage}
  required
/>;
```

Props: `label`, `error`, `hint`, `required`, `onChange: (value: string) => void`

#### SelectInput

```tsx
import { SelectInput } from '@my-girok/ui-components';

<SelectInput
  label="Degree"
  options={[
    { value: 'bachelor', label: "Bachelor's" },
    { value: 'master', label: "Master's" },
  ]}
  value={degree}
  onChange={setDegree}
  placeholder="Select degree"
/>;
```

### UI Components

#### Button

```tsx
import { Button } from '@my-girok/ui-components';

<Button variant="primary" size="lg" loading={isLoading}>
  Submit
</Button>

<Button variant="secondary" size="md">Cancel</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="ghost">More</Button>
```

Props: `variant` (primary/secondary/danger/ghost), `size` (sm/md/lg), `loading`, `fullWidth`

#### Alert

```tsx
import { Alert } from '@my-girok/ui-components';

<Alert variant="error" onClose={() => setError(null)}>
  {errorMessage}
</Alert>

<Alert variant="success" title="Success!">Saved</Alert>
<Alert variant="warning">Warning</Alert>
<Alert variant="info">Info</Alert>
```

### Drag & Drop

```tsx
import { SortableList, SortableItem, DragHandle } from '@my-girok/ui-components';

<SortableList
  items={items}
  onReorder={setItems}
  getItemId={(item) => item.id}
  renderItem={(item) => (
    <SortableItem key={item.id} id={item.id} useDragHandle>
      {item.name}
    </SortableItem>
  )}
/>;
```

Requires peer deps: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### Hooks

#### useAsyncOperation

```tsx
import { useAsyncOperation } from '@my-girok/ui-components';

const { execute, loading, error } = useAsyncOperation({
  onSuccess: (data) => navigate('/success'),
  defaultErrorMessage: 'Operation failed',
});

await execute(async () => {
  return await api.submit(data);
});
```

Returns: `execute`, `loading`, `error`, `data`, `reset`

## Theming

Components use CSS custom properties via `theme-*` Tailwind classes:

```css
/* Light mode */
--light-primary: #8b5e3c; /* Oak Brown */
--light-text-primary: #262220;
--light-bg-card: #f8f7f4;

/* Dark mode */
--dark-primary: #9c835e;
--dark-text-primary: #b0a9a2;
--dark-bg-card: #282522;
```

See `/docs/DESIGN_SYSTEM.md` for full color palette.

## Installation

```bash
# In monorepo - automatically available
pnpm install

# For drag-and-drop
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Development

```bash
pnpm build      # Build package
pnpm dev        # Watch mode
pnpm type-check # Type check
```
