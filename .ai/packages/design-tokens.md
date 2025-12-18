# @my-girok/design-tokens

> WCAG 2.1 AAA compliant design tokens - **V0.0.1 AAA Workstation**

**👉 See [ssot.md](../ssot.md) for 2025 Tailwind CSS 4 naming conventions and migration guide.**

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

| Category   | Example Classes                                                 |
| ---------- | --------------------------------------------------------------- |
| Background | `bg-theme-bg-page`, `bg-theme-bg-card`, `bg-theme-bg-secondary` |
| Text       | `text-theme-text-primary`, `text-theme-text-secondary`          |
| Border     | `border-theme-border-default`, `border-theme-border-subtle`     |
| Primary    | `text-theme-primary`, `bg-theme-primary`                        |
| Shadows    | `shadow-theme-sm`, `shadow-theme-md`, `shadow-theme-lg`         |
| Status     | `bg-theme-status-error-bg`, `text-theme-status-success-text`    |

## Editorial Layout Tokens (V0.0.1)

```css
:root {
  /* Typography */
  --font-family-serif-title: 'Playfair Display', Georgia, serif;
  --font-family-mono-brand: ui-monospace, SFMono-Regular, monospace;

  /* Border Radius */
  --radius-editorial: 40px;
  --radius-editorial-lg: 48px; /* Form cards */
  --radius-editorial-xl: 56px; /* Promo cards */
  --radius-editorial-2xl: 64px; /* Section containers */
  --radius-input: 24px; /* Input fields (lg size) */

  /* Spacing */
  --spacing-editorial: 40px;
  --nav-height-editorial: 80px;

  /* Animation */
  --ease-editorial: cubic-bezier(0.2, 1, 0.3, 1);
}
```

## Tailwind Integration (@theme inline)

```css
@theme inline {
  /* Editorial Layout - V0.0.1 */
  --radius-editorial: 40px;
  --radius-editorial-lg: 48px;
  --radius-editorial-xl: 56px;
  --radius-editorial-2xl: 64px;
  --radius-input: 24px;
  --spacing-editorial: 40px;
  --nav-height-editorial: 80px;

  /* Typography */
  --font-family-serif-title: 'Playfair Display', Georgia, serif;
  --font-family-mono-brand: ui-monospace, SFMono-Regular, monospace;
}
```

## @property Type Safety

Key tokens have @property definitions for:

- Type validation (`syntax: '<color>'` or `syntax: '<length>'`)
- Fallback values (`initial-value`)
- Smooth color transitions in animations

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #6b4a2e; /* AAA 7.94:1 */
}

@property --radius-editorial-2xl {
  syntax: '<length>';
  inherits: true;
  initial-value: 64px;
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

### Border Contrast (WCAG SC 1.4.11)

| Token            | Light   | Dark    | Ratio | Usage           |
| ---------------- | ------- | ------- | ----- | --------------- |
| `border-subtle`  | #D4D2CF | #4A4744 | 1.5:1 | Decorative only |
| `border-default` | #A09D9A | #6B6663 | 3.0:1 | Interactive ✅  |
| `border-strong`  | #8A8785 | #8A8583 | 3.8:1 | Emphasis ✅     |

## Browser Support

- Chrome 85+, Firefox 128+, Safari 15.4+ (for @property)
- Graceful degradation in older browsers

## Migration Status (2025-12)

### ✅ SSOT Complete

All tokens now use proper Tailwind CSS 4 naming conventions for auto-generated utilities:

```css
/* Border Radius - generates rounded-* utilities */
--border-radius-input: 24px; /* → rounded-input */
--border-radius-editorial: 40px; /* → rounded-editorial */
--border-radius-editorial-lg: 48px; /* → rounded-editorial-lg */
--border-radius-editorial-xl: 56px; /* → rounded-editorial-xl */
--border-radius-editorial-2xl: 64px; /* → rounded-editorial-2xl */

/* Letter Spacing - generates tracking-* utilities */
--letter-spacing-brand: 0.3em; /* → tracking-brand */
--letter-spacing-editorial: -0.05em; /* → tracking-editorial */

/* Font Family - generates font-* utilities */
--font-family-serif-title: ...; /* → font-serif-title */
--font-family-mono-brand: ...; /* → font-mono-brand */
```

**See [ssot.md](../ssot.md) for SSOT strategy documentation.**

## Version

**V0.0.1 AAA Workstation** (2025-12)
