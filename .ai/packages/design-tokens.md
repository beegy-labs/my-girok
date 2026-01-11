# @my-girok/design-tokens

> WCAG 2.1 AAA compliant design tokens with local fonts | **Last Updated**: 2026-01-11

## Usage

```css
@import '@my-girok/design-tokens/tokens.css';
@import '@my-girok/design-tokens/fonts/inter.css'; /* Optional */
```

## Local Fonts (SSOT)

| Font             | Usage                |
| ---------------- | -------------------- |
| Playfair Display | Editorial titles     |
| Inter            | Admin interfaces     |
| Pretendard       | PDF generation (CJK) |

**Never use external CDN links.**

## Key Utilities

| Utility            | Value    | Usage              |
| ------------------ | -------- | ------------------ |
| `rounded-soft`     | 8px      | Default for ALL UI |
| `min-h-input`      | 48px     | WCAG AAA           |
| `font-serif-title` | Playfair | Serif headings     |
| `tracking-brand`   | 0.3em    | Brand labels       |

## Token Categories

| Category   | Examples                               |
| ---------- | -------------------------------------- |
| Background | `bg-theme-bg-page`, `bg-theme-bg-card` |
| Text       | `text-theme-text-primary`              |
| Status     | `bg-theme-status-error-bg`             |

## Theming

```html
<html data-theme="light">
  <!-- or "dark" -->
</html>
```

**SSOT**: `docs/llm/packages/design-tokens.md`
