# @my-girok/design-tokens

WCAG 2.1 AA compliant design tokens for my-girok applications.

## Architecture

```
Layer 1: Palette (:root)      → Raw colors, never use directly
Layer 2: Semantic ([data-theme]) → Theme-switchable via data-theme attribute
Layer 3: Tailwind (@theme)    → Maps to utilities (bg-theme-*, text-theme-*)
```

## Usage

```css
/* In your app's CSS entry point */
@import '@my-girok/design-tokens/tokens.css';
```

## Available Tokens

### Background

- `bg-theme-bg-page` - Page background
- `bg-theme-bg-card` - Card backgrounds
- `bg-theme-bg-elevated` - Elevated surfaces
- `bg-theme-bg-hover` - Hover states

### Text

- `text-theme-text-primary` - Primary text
- `text-theme-text-secondary` - Secondary text
- `text-theme-text-muted` - Muted text

### Primary Colors

- `text-theme-primary` - Primary accent
- `bg-theme-primary` - Primary background

### Shadows

- `shadow-theme-sm` / `shadow-theme-md` / `shadow-theme-lg`

## Theming

Set `data-theme="dark"` on `<html>` or any parent element:

```html
<html data-theme="dark"></html>
```

## WCAG Compliance

All color combinations meet WCAG 2.1 AA standards (4.5:1+ contrast ratio).

| Theme | Text on Card       | Contrast     |
| ----- | ------------------ | ------------ |
| Light | #262220 on #F8F7F4 | 13.8:1 (AAA) |
| Dark  | #B0A9A2 on #282522 | 6.1:1 (AA)   |
