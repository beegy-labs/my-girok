# @my-girok/design-tokens

WCAG 2.1 AAA compliant design tokens for my-girok applications.

## Architecture (4-Layer)

```
Layer 0: @property definitions   → Type safety, smooth animations
Layer 1: Palette (:root)         → Raw colors, never use directly
Layer 2: Semantic ([data-theme]) → Theme-switchable via data-theme attribute
Layer 3: Tailwind (@theme inline) → Maps to utilities (bg-theme-*, text-theme-*)
```

## Usage

```css
/* In your app's CSS entry point */
@import '@my-girok/design-tokens/tokens.css';
```

## Layer 0: @property Type Safety

CSS @property definitions provide:

- **Type validation**: `syntax: '<color>'`
- **Fallback values**: `initial-value`
- **Smooth transitions**: Enable color animations

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #6b4a2e; /* AAA 7.94:1 */
}
```

**Browser Support**: Chrome 85+, Firefox 128+, Safari 15.4+

## Available Tokens

### Background

- `bg-theme-bg-page` - Page background
- `bg-theme-bg-card` - Card backgrounds
- `bg-theme-bg-elevated` - Elevated surfaces
- `bg-theme-bg-hover` - Hover states
- `bg-theme-bg-input` - Input backgrounds

### Text

- `text-theme-text-primary` - Primary text
- `text-theme-text-secondary` - Secondary text
- `text-theme-text-tertiary` - Tertiary text
- `text-theme-text-muted` - Muted/placeholder text

### Primary Colors

- `text-theme-primary` - Primary accent
- `bg-theme-primary` - Primary background
- `text-theme-primary-light` / `text-theme-primary-dark`

### Borders

- `border-theme-border-subtle` - Subtle borders
- `border-theme-border-default` - Default borders
- `border-theme-border-strong` - Strong borders

### Focus

- `ring-theme-focus-ring` - Focus ring color (for focus-visible)

### Shadows

- `shadow-theme-sm` / `shadow-theme-md` / `shadow-theme-lg` / `shadow-theme-xl`

### Status Colors

- `bg-theme-status-error-bg` / `text-theme-status-error-text`
- `bg-theme-status-success-bg` / `text-theme-status-success-text`
- `bg-theme-status-warning-bg` / `text-theme-status-warning-text`
- `bg-theme-status-info-bg` / `text-theme-status-info-text`

## Theming

Set `data-theme` on `<html>` or any parent element:

```html
<html data-theme="light">
  <!-- or "dark" -->
</html>
```

## WCAG AAA Compliance

All text color combinations meet WCAG 2.1 AAA standards (7:1+ contrast ratio).

| Element        | Light Mode | Dark Mode                    |
| -------------- | ---------- | ---------------------------- |
| Primary Text   | 15.76:1    | 9.94:1                       |
| Secondary Text | 9.23:1     | 7.65:1                       |
| Tertiary Text  | 7.08:1     | 7.31:1                       |
| Primary Accent | 7.94:1     | 8.25:1 (page), 7.41:1 (card) |

## Color Palette

### Light Mode (Clean White Oak)

| Token                  | Value   | Contrast | Usage            |
| ---------------------- | ------- | -------- | ---------------- |
| `--light-bg-page`      | #FFFFFF | -        | Page background  |
| `--light-bg-card`      | #F8F7F4 | -        | Card backgrounds |
| `--light-text-primary` | #262220 | 15.76:1  | Primary text     |
| `--light-primary`      | #6B4A2E | 7.94:1   | Primary accent   |

### Dark Mode (Midnight Gentle Study)

| Token                 | Value   | Contrast | Usage            |
| --------------------- | ------- | -------- | ---------------- |
| `--dark-bg-page`      | #1E1C1A | -        | Page background  |
| `--dark-bg-card`      | #282522 | -        | Card backgrounds |
| `--dark-text-primary` | #CCC5BD | 9.94:1   | Primary text     |
| `--dark-primary`      | #D0B080 | 8.25:1   | Primary accent   |
