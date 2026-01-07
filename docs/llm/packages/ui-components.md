# @my-girok/ui-components

WCAG 2.1 AAA React components

## Components

```yaml
Button:
  variant: [primary, secondary, danger, ghost]
  size: [sm, md, lg, xl] # xl=64px
  rounded: [default, subtle, editorial, full]
  heights: { sm: 44px, md: 44px, lg: 56px, xl: 64px }
  font: { lg: font-black uppercase, xl: font-black uppercase }

TextInput:
  size: [sm, default, lg, xl]
  variant: [default, filled, outlined, ghost]
  heights: { sm: 40px, default: 48px, lg: 56px, xl: 64px }
  features: [icon, showPasswordToggle, clearable, showCharCount]

Card:
  variant: [primary, secondary, elevated]
  padding: [none, sm, md, lg, xl, responsive]
  radius: [none, subtle, default, lg, xl, 2xl]

Badge:
  variant: [default, success, warning, error, info]
  size: [sm, md, lg]
```

| Component          | Purpose                 |
| ------------------ | ----------------------- |
| Alert              | Status messages         |
| SelectInput        | Dropdown                |
| TextArea           | Multi-line input        |
| CollapsibleSection | Expandable section      |
| MenuCard           | 64px editorial card     |
| MenuRow            | List row with pin       |
| ViewToggle         | Grid/List toggle (56px) |
| TopWidget          | Dashboard pinned        |
| PageContainer      | Page wrapper            |
| PageHeader         | Title + back link       |

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
useClickOutside(ref, isOpen, () => setIsOpen(false));
```

## Commands

```bash
pnpm --filter @my-girok/ui-components storybook  # Dev
pnpm --filter @my-girok/ui-components build      # Build
```
