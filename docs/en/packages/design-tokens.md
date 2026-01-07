# @my-girok/design-tokens

> WCAG 2.1 AAA compliant design tokens with local fonts

## Installation

```css
/* Main tokens with Playfair Display */
@import '@my-girok/design-tokens/tokens.css';

/* Inter font for admin interfaces */
@import '@my-girok/design-tokens/fonts/inter.css';
```

## Local Fonts

All fonts are self-hosted for privacy, performance, and offline support.

| Font             | Weights            | Usage                            |
| ---------------- | ------------------ | -------------------------------- |
| Playfair Display | 400-900 + italic   | Editorial headings, display text |
| Inter            | 400, 500, 600, 700 | Admin interfaces, body text      |
| Pretendard       | 400, 600, 700      | PDF generation, CJK characters   |

### Font Directory Structure

```
packages/design-tokens/fonts/
  inter/                    # Inter font files
  playfair-display/         # Playfair Display font files
  pretendard/               # Pretendard font files
  inter.css                 # Inter CSS imports
  playfair-display.css      # Playfair CSS imports
  pretendard.css            # Pretendard CSS imports
  index.css                 # Combined imports
```

### PDF Font Usage

```typescript
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
import PretendardBold from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Bold.otf';
```

## Token Categories

### Background

| Class              | Usage                   |
| ------------------ | ----------------------- |
| `bg-theme-bg-page` | Page background         |
| `bg-theme-bg-card` | Card/surface background |

### Text

| Class                       | Usage                |
| --------------------------- | -------------------- |
| `text-theme-text-primary`   | Primary text content |
| `text-theme-text-secondary` | Secondary/muted text |

### Border

| Class                         | Usage                |
| ----------------------------- | -------------------- |
| `border-theme-border-default` | Default borders      |
| `border-theme-border-subtle`  | Subtle/light borders |

### Primary Accent

| Class                | Usage                     |
| -------------------- | ------------------------- |
| `text-theme-primary` | Primary accent text       |
| `bg-theme-primary`   | Primary accent background |

### Status Colors

| Class                            | Usage              |
| -------------------------------- | ------------------ |
| `bg-theme-status-error-bg`       | Error background   |
| `text-theme-status-success-text` | Success text       |
| `bg-theme-status-warning-bg`     | Warning background |

## Utility Classes

| Utility            | Value            | Usage                        |
| ------------------ | ---------------- | ---------------------------- |
| `rounded-soft`     | 8px              | Default UI elements          |
| `rounded-full`     | 50%              | Avatars, pills               |
| `min-h-touch-aa`   | 44px             | WCAG AA minimum touch target |
| `min-h-input`      | 48px             | WCAG AAA inputs              |
| `pt-nav`           | 80px             | Navigation height padding    |
| `h-nav`            | 80px             | Navigation height            |
| `tracking-brand`   | 0.3em            | Brand label spacing          |
| `font-serif-title` | Playfair Display | Serif headings               |

## WCAG Contrast Ratios

All color combinations meet or exceed WCAG AAA requirements (7:1).

| Element        | Light Theme | Dark Theme |
| -------------- | ----------- | ---------- |
| Primary Text   | 15.76:1     | 9.94:1     |
| Secondary Text | 9.23:1      | 7.65:1     |
| Primary Accent | 7.94:1      | 8.25:1     |

## Theming

Enable dark or light mode using the `data-theme` attribute:

```html
<html data-theme="light">
  <!-- Light theme -->
</html>

<html data-theme="dark">
  <!-- Dark theme -->
</html>
```

## Best Practices

### DO

```tsx
// Use utility classes
<div className="rounded-soft border p-4">

// Use typography utilities
<h1 className="font-serif-title tracking-editorial">

// Use theme tokens
<div className="bg-theme-bg-card text-theme-text-primary">
```

### DON'T

```tsx
// Don't use arbitrary values
<div className="rounded-[48px]">

// Don't use inline styles for tokens
<h1 style={{ fontFamily: 'var(--font-family-serif-title)' }}>

// Don't hardcode colors
<div className="bg-[#f5f5f5] text-[#333]">
```

---

**LLM Reference**: `docs/llm/packages/design-tokens.md`
