# @my-girok/design-tokens

> WCAG 2.1 AAA compliant design tokens

## Usage

```css
@import '@my-girok/design-tokens/tokens.css';
```

## Token Categories

| Category   | Example Classes                                              |
| ---------- | ------------------------------------------------------------ |
| Background | `bg-theme-bg-page`, `bg-theme-bg-card`                       |
| Text       | `text-theme-text-primary`, `text-theme-text-secondary`       |
| Border     | `border-theme-border-default`, `border-theme-border-subtle`  |
| Primary    | `text-theme-primary`, `bg-theme-primary`                     |
| Status     | `bg-theme-status-error-bg`, `text-theme-status-success-text` |

## Key Utilities

| Utility            | Value    | Usage                  |
| ------------------ | -------- | ---------------------- |
| `rounded-soft`     | 8px      | **Default for ALL UI** |
| `rounded-full`     | 50%      | Avatars, pills         |
| `min-h-touch-aa`   | 44px     | WCAG AA minimum        |
| `min-h-input`      | 48px     | WCAG AAA               |
| `pt-nav`, `h-nav`  | 80px     | Navigation height      |
| `tracking-brand`   | 0.3em    | Brand labels           |
| `font-serif-title` | Playfair | Serif headings         |

## WCAG Compliance

All text meets 7:1+ contrast (AAA):

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

## DO / DON'T

```tsx
// ✅ SSOT Pattern
<div className="rounded-soft border p-4">Card</div>
<h1 className="font-serif-title tracking-editorial">Title</h1>

// ❌ Anti-Pattern
<div className="rounded-[48px]">
<h1 style={{ fontFamily: 'var(--font-family-serif-title)' }}>
```

---

**SSOT Guide**: `.ai/ssot.md`
**Full Spec**: `docs/DESIGN_SYSTEM.md`
