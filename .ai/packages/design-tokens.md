# @my-girok/design-tokens

WCAG 2.1 AAA compliant design tokens package with CSS @property type safety.

## Purpose

Single source of truth for design tokens, ensuring:

- Explicit dependency management
- Type-safe CSS variables via @property
- Smooth theme transitions via @theme inline

## Architecture (4-Layer)

```
Layer 0: @property definitions  → Type safety, smooth animations
Layer 1: Palette (:root)        → Raw colors (never use directly)
Layer 2: Semantic ([data-theme]) → Theme-switchable tokens
Layer 3: Tailwind (@theme inline) → Utility classes (dynamic)
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

## @property Type Safety

Key tokens have @property definitions for:

- Type validation (`syntax: '<color>'`)
- Fallback values (`initial-value`)
- Smooth color transitions in animations

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #8b5e3c;
}
```

## Theming

```html
<html data-theme="light">
  <!-- or "dark" -->
</html>
```

## WCAG Compliance

All text combinations meet 7:1+ contrast ratio (AAA standard).

| Element          | Light Mode | Dark Mode                    |
| ---------------- | ---------- | ---------------------------- |
| Primary Text     | 15.76:1    | 9.94:1                       |
| Secondary Text   | 9.23:1     | 7.65:1                       |
| Tertiary Text    | 7.08:1     | 7.31:1                       |
| Primary Accent   | 7.94:1     | 8.25:1 (page), 7.41:1 (card) |
| Primary Button   | 7.70:1+    | 9.46:1+                      |
| Secondary Button | 7.41:1     | 7.54:1                       |
| Danger Button    | 9.51:1     | 9.51:1                       |
| Status Success   | 7.87:1     | 8.44:1                       |
| Status Error     | 7.77:1     | 7.89:1                       |
| Status Warning   | 7.59:1     | 13.13:1                      |
| Status Info      | 8.63:1     | 9.71:1                       |

## Browser Support

- Chrome 85+, Firefox 128+, Safari 15.4+ (for @property)
- Graceful degradation in older browsers
