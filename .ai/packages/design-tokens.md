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

| Category         | Utility Class        | Usage                              |
| ---------------- | -------------------- | ---------------------------------- |
| Border Radius    | `rounded-subtle`     | Minimal (4px) - corners            |
|                  | `rounded-soft`       | **Default (8px)** - ALL UI         |
|                  | `rounded-full`       | Circular elements (avatars, pills) |
| Typography       | `font-serif-title`   | Serif headings                     |
|                  | `font-mono-brand`    | Brand labels                       |
| Brand Font Sizes | `text-brand-2xs`     | 10px                               |
|                  | `text-brand-xs`      | 11px (Button lg, Badge sm)         |
|                  | `text-brand-sm`      | 12px (Labels)                      |
|                  | `text-brand-md`      | 13px                               |
|                  | `text-brand-base`    | 14px (Button xl, Badge lg)         |
|                  | `text-brand-lg`      | 15px                               |
|                  | `text-brand-xl`      | 16px                               |
|                  | `text-brand-2xl`     | 18px                               |
| Letter Spacing   | `tracking-brand-sm`  | Small labels (0.2em)               |
|                  | `tracking-brand-md`  | Footer links (0.25em)              |
|                  | `tracking-brand`     | Default brand (0.3em)              |
|                  | `tracking-brand-lg`  | Large brand (0.5em)                |
|                  | `tracking-editorial` | Serif headings (-0.05em)           |
| Input Heights    | `min-h-touch-aa`     | 44px (WCAG AA minimum)             |
|                  | `min-h-input`        | 48px (WCAG AAA)                    |
|                  | `min-h-input-lg`     | 56px (Button/Input lg)             |
|                  | `min-h-input-xl`     | 64px (Button/Input xl)             |
| Spacing          | `pt-nav`, `h-nav`    | Navigation height (80px)           |
|                  | `mb-section`         | Section margin (96px)              |
| Container Width  | `max-w-auth-form`    | Auth form (576px)                  |
| Focus Ring       | `ring-[4px]`         | AAA focus ring (4px)               |

### Unified Radius Policy (V0.0.1 - 2025-12)

**All UI components use `rounded-soft` (8px)** - unified, consistent border radius across the entire application.

```tsx
// ✅ ALL components use soft radius (8px)
<Card>...</Card>           // rounded-soft (8px)
<Button>...</Button>       // rounded-soft (8px)
<TextInput />              // rounded-soft (8px)
<SelectInput />            // rounded-soft (8px)
<TextArea />               // rounded-soft (8px)
<CollapsibleSection />     // rounded-soft (8px)
<PageHeader />             // rounded-soft (8px)
<Alert>...</Alert>         // rounded-soft (8px)

// ✅ Exceptions
<Avatar />                 // rounded-full (circular)
```

**Deprecated (DO NOT USE):**

- ~~`rounded-input`~~ (24px) → Use `rounded-soft`
- ~~`rounded-widget`~~ (32px) → Use `rounded-soft`
- ~~`rounded-editorial*`~~ (40-64px) → Use `rounded-soft`

### Usage Pattern

```tsx
// ✅ SSOT Pattern
<h1 className="font-serif-title tracking-editorial italic">Title</h1>
<div className="rounded-soft border p-10">Form Card</div>
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

## Storybook Sync

When updating tokens, also update Storybook documentation:

1. **Color changes** → `packages/ui-components/src/DesignTokens.mdx`
2. **Branding colors** → `.storybook/manager.ts` (sidebar, buttons)
3. **New tokens** → Add to color palette or token tables in MDX
4. **Verify** → `pnpm --filter @my-girok/ui-components storybook`

Live preview: https://design-dev.girok.dev

## References

| Document                                | Content                           |
| --------------------------------------- | --------------------------------- |
| [ssot.md](../ssot.md)                   | SSOT 전략, 마이그레이션 가이드    |
| `packages/design-tokens/src/tokens.css` | 실제 토큰 정의 (source of truth)  |
| `docs/DESIGN_SYSTEM.md`                 | 상세 디자인 스펙 (human-readable) |

## Version

**V0.0.1 AAA Workstation** (2025-12)
