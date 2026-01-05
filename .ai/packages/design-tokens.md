# @my-girok/design-tokens

> WCAG 2.1 AAA compliant design tokens with local fonts

## Usage

```css
/* Import tokens (includes Playfair Display font automatically) */
@import '@my-girok/design-tokens/tokens.css';

/* Optional: Import Inter font separately (for admin interfaces) */
@import '@my-girok/design-tokens/fonts/inter.css';
```

## Local Fonts (SSOT)

All fonts are stored locally in this package. **Never use external CDN links.**

| Font             | Weights                   | Usage                |
| ---------------- | ------------------------- | -------------------- |
| Playfair Display | 400-900 (normal + italic) | Editorial titles     |
| Inter            | 400, 500, 600, 700        | Admin interfaces     |
| Pretendard       | 400, 600, 700             | PDF generation (CJK) |

### Font Files Location

```
packages/design-tokens/fonts/
├── inter/                 # Inter font files (.ttf)
├── playfair-display/      # Playfair Display font files (.ttf)
├── pretendard/            # Pretendard font files (.otf) - Korean/CJK
├── inter.css              # @font-face for Inter
├── playfair-display.css   # @font-face for Playfair Display
├── pretendard.css         # @font-face for Pretendard
├── index.css              # All fonts combined
└── LICENSE                # OFL 1.1 license for all fonts
```

### PDF Generation Font Import

```typescript
// For @react-pdf/renderer, import font files directly
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
import PretendardBold from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Bold.otf';
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
