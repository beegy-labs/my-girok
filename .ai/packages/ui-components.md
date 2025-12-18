# @my-girok/ui-components

> Shared React 19 components - **V0.0.1 AAA Workstation**

## Purpose

Reusable UI components for React applications in the monorepo. All components meet WCAG 2.1 AAA standards (7:1+ contrast) with 44px+ touch targets, focus-visible keyboard navigation, and editorial typography.

## Structure

```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx           # Badge, SectionBadge (lg size, rounded options)
│   │   ├── Button.tsx          # sm/md/lg/xl sizes, rounded options
│   │   ├── Card.tsx            # radius: default/lg/xl/2xl
│   │   ├── CollapsibleSection.tsx
│   │   ├── MenuCard.tsx        # Editorial 64px card
│   │   ├── MenuRow.tsx         # Editorial list row with pin support
│   │   ├── PageContainer.tsx
│   │   ├── PageHeader.tsx
│   │   ├── PageLayout.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── SelectInput.tsx
│   │   ├── SortableItem.tsx
│   │   ├── SortableList.tsx
│   │   ├── TextArea.tsx
│   │   ├── TextInput.tsx       # default/lg sizes, icon support
│   │   ├── TopWidget.tsx       # Pinned dashboard widget
│   │   ├── ViewToggle.tsx      # Grid/List toggle (56px)
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAsyncOperation.ts
│   │   ├── useClickOutside.ts
│   │   ├── useDebounce.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Components (V0.0.1)

### Button

```typescript
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl'; // xl = 64px, font-black
  rounded?: 'default' | 'editorial' | 'full'; // editorial = 24px
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}
```

**Size Reference:**

| Size | Min Height | Typography                                          |
| ---- | ---------- | --------------------------------------------------- |
| sm   | 44px       | Standard                                            |
| md   | 44px       | Standard                                            |
| lg   | 48px       | Standard                                            |
| xl   | 64px       | `font-black uppercase tracking-[0.3em] text-[14px]` |

**Rounded Options:**

| Option    | Radius | Usage                  |
| --------- | ------ | ---------------------- |
| default   | 12px   | Standard buttons       |
| editorial | 24px   | Form buttons (V0.0.1)  |
| full      | 50%    | Hero buttons, circular |

**Usage:**

```tsx
// Primary submit (xl size, editorial rounded)
<Button variant="primary" size="xl" rounded="editorial" icon={<ArrowRight />}>
  Sign In
</Button>

// Secondary action (lg size)
<Button variant="secondary" size="lg" rounded="editorial">
  Create Account
</Button>

// Hero button
<Button variant="primary" size="xl" rounded="full" className="px-20 py-8">
  Enter
</Button>
```

### TextInput

```typescript
export interface TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  required?: boolean;
  icon?: ReactNode; // Left icon (V0.0.1)
  size?: 'default' | 'lg'; // lg = h-16, rounded-[24px]
}
```

**Size Reference:**

| Size    | Height | Radius | Font      | Icon Padding |
| ------- | ------ | ------ | --------- | ------------ |
| default | 48px   | 12px   | normal    | pl-12        |
| lg      | 64px   | 24px   | font-bold | pl-14        |

**Usage:**

```tsx
<TextInput
  label="Email"
  type="email"
  size="lg"
  icon={<Mail size={18} />}
  value={email}
  onChange={setEmail}
  required
/>
```

### Card

```typescript
export interface CardProps {
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  radius?: 'default' | 'lg' | 'xl' | '2xl'; // V0.0.1 options
}
```

**Radius Options (V0.0.1):**

| Option  | Size | Usage              |
| ------- | ---- | ------------------ |
| default | 12px | Standard cards     |
| lg      | 40px | Editorial cards    |
| xl      | 48px | Form cards         |
| 2xl     | 64px | Section containers |

### Badge

```typescript
export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md' | 'lg'; // lg = text-[14px] font-black
  rounded?: 'default' | 'full'; // V0.0.1: rounded options
}
```

**V0.0.1 Styling:**

- `font-black` (was font-bold)
- `tracking-widest`
- lg size: `text-[14px]`
- rounded options: `default` (rounded-lg) or `full` (rounded-full)

### MenuCard

Editorial navigation card with 64px radius.

```typescript
export interface MenuCardProps {
  index: number; // Displays as "01", "02", etc.
  icon: React.ReactNode; // In p-6 rounded-[28px] container
  title: string; // text-4xl serif
  description: string; // text-[18px] font-bold
  onClick?: () => void;
  isPinned?: boolean; // Pin indicator
  onPin?: () => void; // Pin handler
  pinTooltip?: string;
}
```

**V0.0.1 Styling:**

- Card: `rounded-[64px] border-2 p-10 md:p-12 min-h-[320px]`
- Icon container: `p-6 rounded-[28px] border-2`
- Index: `text-[12px] font-black tracking-[0.3em] monospace`
- Description: `text-[18px] font-bold`

### MenuRow

Compact list row for list view mode.

```typescript
export interface MenuRowProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  description?: string; // V0.0.1: description support
  onClick?: () => void;
  isPinned?: boolean;
  onPin?: () => void;
}
```

**V0.0.1 Styling:**

- `rounded-3xl border-2`
- Pin support in list view

### ViewToggle

Grid/List view mode toggle.

```typescript
export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}
```

**V0.0.1 Styling:**

- `min-h-[56px]` touch targets
- `rounded-2xl`
- `shadow-theme-lg`

### TopWidget

Pinned widget for dashboard.

```typescript
export interface TopWidgetProps {
  icon: React.ReactNode;
  title: string; // Serif font
  badgeText?: string;
  onChangeFocus?: () => void;
  changeFocusText?: string;
  children: React.ReactNode;
}
```

**V0.0.1 Styling:**

- Icon container: `p-3 border rounded-2xl` (was p-4 border-2 rounded-[20px])
- Larger padding: `p-10 sm:p-12`

### Alert

```typescript
export interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}
```

### SortableList (DnD Kit)

```typescript
export interface SortableListProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}
```

## Hooks

### useAsyncOperation

```typescript
const { execute, loading, error, data, reset } = useAsyncOperation({
  onSuccess: (data) => navigate('/dashboard'),
  onError: (error) => console.error(error),
});

await execute(() => api.createPost(data));
```

### useClickOutside

```typescript
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, isOpen, () => setIsOpen(false));
```

### useDebounce

```typescript
const debouncedSearch = useDebounce(searchTerm, 300);
```

## Theme Tokens

Components use semantic theme tokens from `@my-girok/design-tokens`:

| Token                                 | Usage                |
| ------------------------------------- | -------------------- |
| `bg-theme-bg-page`                    | Page background      |
| `bg-theme-bg-card`                    | Card background      |
| `bg-theme-bg-secondary`               | Section background   |
| `bg-theme-bg-input`                   | Input background     |
| `bg-theme-bg-hover`                   | Hover states         |
| `text-theme-text-primary`             | Primary text         |
| `text-theme-text-secondary`           | Secondary text       |
| `text-theme-text-muted`               | Placeholder text     |
| `border-theme-border-default`         | Default borders      |
| `border-theme-border-subtle`          | Subtle borders       |
| `text-theme-primary`                  | Primary accent color |
| `focus-visible:ring-theme-focus-ring` | Focus ring           |

## Installation

```bash
# In monorepo - automatically available via workspace
pnpm install
```

## Dependencies

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@my-girok/design-tokens": "workspace:*"
  }
}
```

## React 19 Compatibility

All components use **ref-as-prop** pattern:

```typescript
export function Button({ ref, ...props }: ButtonProps) {
  return <button ref={ref} {...props} />;
}
```

## Version

**V0.0.1 AAA Workstation** (2025-12)
