# @my-girok/design-tokens

WCAG 2.1 AA compliant design tokens package.

## Purpose

Single source of truth for design tokens, ensuring explicit dependency management.

## Architecture

```
Layer 1: Palette (:root)        → Raw colors
Layer 2: Semantic ([data-theme]) → Theme-switchable
Layer 3: Tailwind (@theme)      → Utility classes
```

## Usage

```css
@import '@my-girok/design-tokens/tokens.css';
```

## Consumers

- `@my-girok/ui-components` (peerDependency)
- `apps/web-main` (dependency)

## Token Categories

| Category   | Example Classes                                        |
| ---------- | ------------------------------------------------------ |
| Background | `bg-theme-bg-page`, `bg-theme-bg-card`                 |
| Text       | `text-theme-text-primary`, `text-theme-text-secondary` |
| Border     | `border-theme-border-subtle`                           |
| Primary    | `text-theme-primary`, `bg-theme-primary`               |
| Shadows    | `shadow-theme-sm`, `shadow-theme-lg`                   |
| Status     | `bg-theme-status-error-bg`                             |

## Theming

```html
<html data-theme="light">
  <!-- or "dark" -->
</html>
```

## WCAG Compliance

All combinations meet 4.5:1+ contrast ratio (AA standard).
