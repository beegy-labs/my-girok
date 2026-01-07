# @my-girok/design-tokens

WCAG 2.1 AAA compliant design tokens with local fonts

## Usage

```css
@import '@my-girok/design-tokens/tokens.css'; /* Main + Playfair */
@import '@my-girok/design-tokens/fonts/inter.css'; /* Admin interfaces */
```

## Local Fonts

| Font             | Weights         | Usage     |
| ---------------- | --------------- | --------- |
| Playfair Display | 400-900 +italic | Editorial |
| Inter            | 400,500,600,700 | Admin UI  |
| Pretendard       | 400,600,700     | PDF/CJK   |

```
packages/design-tokens/fonts/
  inter/, playfair-display/, pretendard/  # Font files
  inter.css, playfair-display.css, pretendard.css, index.css
```

```typescript
// PDF generation
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
```

## Token Categories

| Category   | Classes                                                      |
| ---------- | ------------------------------------------------------------ |
| Background | `bg-theme-bg-page`, `bg-theme-bg-card`                       |
| Text       | `text-theme-text-primary`, `text-theme-text-secondary`       |
| Border     | `border-theme-border-default`, `-subtle`                     |
| Primary    | `text-theme-primary`, `bg-theme-primary`                     |
| Status     | `bg-theme-status-error-bg`, `text-theme-status-success-text` |

## Utilities

| Utility            | Value    | Usage          |
| ------------------ | -------- | -------------- |
| `rounded-soft`     | 8px      | Default UI     |
| `rounded-full`     | 50%      | Avatars, pills |
| `min-h-touch-aa`   | 44px     | WCAG AA min    |
| `min-h-input`      | 48px     | WCAG AAA       |
| `pt-nav`, `h-nav`  | 80px     | Nav height     |
| `tracking-brand`   | 0.3em    | Brand labels   |
| `font-serif-title` | Playfair | Serif headings |

## WCAG Contrast

| Element        | Light   | Dark   |
| -------------- | ------- | ------ |
| Primary Text   | 15.76:1 | 9.94:1 |
| Secondary Text | 9.23:1  | 7.65:1 |
| Primary Accent | 7.94:1  | 8.25:1 |

## Theming

```html
<html data-theme="light">
  <!-- or "dark" -->
</html>
```

## Patterns

```tsx
// DO
<div className="rounded-soft border p-4">
<h1 className="font-serif-title tracking-editorial">

// DON'T
<div className="rounded-[48px]">
<h1 style={{ fontFamily: 'var(--font-family-serif-title)' }}>
```
