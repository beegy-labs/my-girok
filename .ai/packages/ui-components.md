# @my-girok/ui-components

> WCAG 2.1 AAA React components - V0.0.1 | **Last Updated**: 2026-01-06

## Components

### Button

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl'; // xl = 64px, font-black
  rounded?: 'default' | 'subtle' | 'editorial' | 'full';
}
```

| Size  | Height | Font                   |
| ----- | ------ | ---------------------- |
| sm/md | 44px   | Standard               |
| lg    | 56px   | `font-black uppercase` |
| xl    | 64px   | `font-black uppercase` |

### TextInput

```typescript
interface TextInputProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  variant?: 'default' | 'filled' | 'outlined' | 'ghost';
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
  variant?: 'primary' | 'secondary' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  radius?: 'none' | 'subtle' | 'default' | 'lg' | 'xl' | '2xl';
}
```

### Badge / SectionBadge

```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}
```

### Other Components

| Component          | Purpose                             |
| ------------------ | ----------------------------------- |
| Alert              | Success/error/warning/info messages |
| SelectInput        | Dropdown select                     |
| TextArea           | Multi-line input                    |
| CollapsibleSection | Expandable section                  |
| MenuCard           | 64px editorial card                 |
| MenuRow            | List row with pin                   |
| ViewToggle         | Grid/List toggle (56px)             |
| TopWidget          | Dashboard pinned widget             |
| PageContainer      | Page wrapper                        |
| PageHeader         | Page title with back link           |

## Theme Tokens

```tsx
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
```

| Token                         | Usage           |
| ----------------------------- | --------------- |
| `bg-theme-bg-page`            | Page background |
| `bg-theme-bg-card`            | Card background |
| `text-theme-text-primary`     | Primary text    |
| `border-theme-border-default` | Borders         |
| `text-theme-primary`          | Accent color    |

## Hooks

```typescript
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, isOpen, () => setIsOpen(false));
```

## Commands

```bash
pnpm --filter @my-girok/ui-components storybook  # Dev
pnpm --filter @my-girok/ui-components build      # Build
```

---

**SSOT**: `docs/llm/packages/ui-components.md` | **Full docs**: `docs/en/packages/ui-components.md`
