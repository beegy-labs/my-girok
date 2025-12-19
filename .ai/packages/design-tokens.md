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

## SSOT Utility Classes (V0.0.1)

LLM 작업 시 아래 유틸리티 클래스를 사용:

| Category       | Utility Class           | Usage                    |
| -------------- | ----------------------- | ------------------------ |
| Border Radius  | `rounded-input`         | Inputs, buttons (24px)   |
|                | `rounded-editorial`     | Cards (40px)             |
|                | `rounded-editorial-lg`  | Form cards (48px)        |
|                | `rounded-editorial-xl`  | Hero sections (56px)     |
|                | `rounded-editorial-2xl` | Menu cards (64px)        |
| Typography     | `font-serif-title`      | Serif headings           |
|                | `font-mono-brand`       | Brand labels             |
| Letter Spacing | `tracking-brand-sm`     | Small labels (0.2em)     |
|                | `tracking-brand`        | Default brand (0.3em)    |
|                | `tracking-brand-lg`     | Large brand (0.5em)      |
|                | `tracking-editorial`    | Serif headings (-0.05em) |

### Usage Pattern

```tsx
// ✅ SSOT Pattern
<h1 className="font-serif-title tracking-editorial italic">Title</h1>
<div className="rounded-editorial-lg border-2 p-10">Form Card</div>
<span className="font-mono-brand tracking-brand uppercase">GIROK.</span>

// ❌ Anti-Pattern (DO NOT USE)
<h1 style={{ fontFamily: 'var(--font-family-serif-title)' }}>
<div className="rounded-[48px]">
<span className="tracking-[0.3em]">
```

## @property Type Safety

Key tokens use CSS @property for type validation and smooth transitions.
See `packages/design-tokens/src/tokens.css` for definitions.

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

## References

| Document                                | Content                           |
| --------------------------------------- | --------------------------------- |
| [ssot.md](../ssot.md)                   | SSOT 전략, 마이그레이션 가이드    |
| `packages/design-tokens/src/tokens.css` | 실제 토큰 정의 (source of truth)  |
| `docs/DESIGN_SYSTEM.md`                 | 상세 디자인 스펙 (human-readable) |

## Version

**V0.0.1 AAA Workstation** (2025-12)
