# @my-girok/ui-components

> WCAG 2.1 AAA compliant React components

## Components

### Button

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg' | 'xl';
  rounded: 'default' | 'subtle' | 'editorial' | 'full';
}
```

| Size | Height | Typography           |
| ---- | ------ | -------------------- |
| sm   | 44px   | Normal               |
| md   | 44px   | Normal               |
| lg   | 56px   | font-black uppercase |
| xl   | 64px   | font-black uppercase |

### TextInput

```typescript
interface TextInputProps {
  size: 'sm' | 'default' | 'lg' | 'xl';
  variant: 'default' | 'filled' | 'outlined' | 'ghost';
  icon?: ReactNode;
  showPasswordToggle?: boolean;
  clearable?: boolean;
  showCharCount?: boolean;
}
```

| Size    | Height |
| ------- | ------ |
| sm      | 40px   |
| default | 48px   |
| lg      | 56px   |
| xl      | 64px   |

### Card

```typescript
interface CardProps {
  variant: 'primary' | 'secondary' | 'elevated';
  padding: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  radius: 'none' | 'subtle' | 'default' | 'lg' | 'xl' | '2xl';
}
```

### Badge

```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  size: 'sm' | 'md' | 'lg';
}
```

## Component List

| Component          | Purpose                              |
| ------------------ | ------------------------------------ |
| Alert              | Status messages and notifications    |
| SelectInput        | Dropdown select menus                |
| TextArea           | Multi-line text input                |
| CollapsibleSection | Expandable/collapsible sections      |
| MenuCard           | 64px editorial-style menu cards      |
| MenuRow            | List row with pin indicator          |
| ViewToggle         | Grid/List view toggle (56px)         |
| TopWidget          | Dashboard pinned widgets             |
| PageContainer      | Page wrapper with consistent padding |
| PageHeader         | Title with optional back link        |

## Theme Tokens

Use theme tokens for consistent styling across light and dark modes:

```tsx
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
  {/* Content */}
</div>
```

### Available Tokens

| Token                         | Usage                     |
| ----------------------------- | ------------------------- |
| `bg-theme-bg-page`            | Page background           |
| `bg-theme-bg-card`            | Card/surface background   |
| `text-theme-text-primary`     | Primary text color        |
| `text-theme-text-secondary`   | Secondary text color      |
| `border-theme-border-default` | Default borders           |
| `border-theme-border-subtle`  | Subtle borders            |
| `text-theme-primary`          | Primary accent color      |
| `bg-theme-primary`            | Primary accent background |

## Hooks

### useClickOutside

Detect clicks outside a referenced element:

```typescript
import { useClickOutside } from '@my-girok/ui-components';

const ref = useRef<HTMLDivElement>(null);
const [isOpen, setIsOpen] = useState(false);

useClickOutside(ref, isOpen, () => setIsOpen(false));

return (
  <div ref={ref}>
    {isOpen && <Dropdown />}
  </div>
);
```

## Commands

```bash
# Development (Storybook)
pnpm --filter @my-girok/ui-components storybook

# Build for production
pnpm --filter @my-girok/ui-components build
```

---

**LLM Reference**: `docs/llm/packages/ui-components.md`
