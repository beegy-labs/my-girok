# @my-girok/ui-components

> WCAG 2.1 AAA React components - V0.0.1 | **Last Updated**: 2026-01-11

## Components

| Component   | Sizes            | Purpose                           |
| ----------- | ---------------- | --------------------------------- |
| Button      | sm/md/lg/xl      | Primary, secondary, danger, ghost |
| TextInput   | sm/default/lg/xl | With icon, password toggle, clear |
| Card        | -                | Primary, secondary, elevated      |
| Badge       | sm/md/lg         | Status indicators                 |
| Alert       | -                | Success/error/warning/info        |
| SelectInput | -                | Dropdown select                   |

## Size Reference

| Size    | Height |
| ------- | ------ |
| sm      | 40px   |
| default | 48px   |
| lg      | 56px   |
| xl      | 64px   |

## Theme Tokens

```tsx
<div className="bg-theme-bg-card text-theme-text-primary">
```

| Token                     | Usage           |
| ------------------------- | --------------- |
| `bg-theme-bg-page`        | Page background |
| `bg-theme-bg-card`        | Card background |
| `text-theme-text-primary` | Primary text    |

## Commands

```bash
pnpm --filter @my-girok/ui-components storybook  # Dev
pnpm --filter @my-girok/ui-components build      # Build
```

**SSOT**: `docs/llm/packages/ui-components.md`
