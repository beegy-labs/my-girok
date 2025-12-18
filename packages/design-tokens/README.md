# @my-girok/design-tokens

WCAG 2.1 AA compliant design tokens for my-girok applications.

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
  initial-value: #8b5e3c;
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

## WCAG Compliance

All color combinations meet WCAG 2.1 AA standards (4.5:1+ contrast ratio).

| Theme | Text on Card       | Contrast     |
| ----- | ------------------ | ------------ |
| Light | #262220 on #F8F7F4 | 13.8:1 (AAA) |
| Dark  | #B0A9A2 on #282522 | 6.1:1 (AA)   |

## Color Palette

### Light Mode (Clean White Oak)

| Token                  | Value   | Usage            |
| ---------------------- | ------- | ---------------- |
| `--light-bg-page`      | #FFFFFF | Page background  |
| `--light-bg-card`      | #F8F7F4 | Card backgrounds |
| `--light-text-primary` | #262220 | Primary text     |
| `--light-primary`      | #8B5E3C | Primary accent   |

### Dark Mode (Midnight Gentle Study)

| Token                 | Value   | Usage            |
| --------------------- | ------- | ---------------- |
| `--dark-bg-page`      | #1E1C1A | Page background  |
| `--dark-bg-card`      | #282522 | Card backgrounds |
| `--dark-text-primary` | #B0A9A2 | Primary text     |
| `--dark-primary`      | #9C835E | Primary accent   |
