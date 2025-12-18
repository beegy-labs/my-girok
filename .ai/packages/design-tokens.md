# @my-girok/design-tokens

WCAG 2.1 AA compliant design tokens package with CSS @property type safety.

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

All combinations meet 4.5:1+ contrast ratio (AA standard).

## Browser Support

- Chrome 85+, Firefox 128+, Safari 15.4+ (for @property)
- Graceful degradation in older browsers
