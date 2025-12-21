# Single Source of Truth (SSOT) Strategy

> **2025 Tailwind CSS 4 Best Practices** - 관리포인트 최소화 전략

## Core Principle

**한 곳에서 정의하고, 어디서든 동일하게 사용한다.**

```
tokens.css (@theme)  →  Tailwind Utility Classes  →  Components
     ↑                         ↓
  Single Source            Auto-generated
```

## Tailwind CSS 4 @theme Naming Convention

Tailwind CSS 4에서는 `@theme` 블록의 **CSS 변수 네이밍**에 따라 **유틸리티 클래스가 자동 생성**됩니다.

| CSS Variable Prefix  | Generated Utility            | Example                                           |
| -------------------- | ---------------------------- | ------------------------------------------------- |
| `--border-radius-*`  | `rounded-*`                  | `--border-radius-editorial` → `rounded-editorial` |
| `--font-family-*`    | `font-*`                     | `--font-family-serif-title` → `font-serif-title`  |
| `--letter-spacing-*` | `tracking-*`                 | `--letter-spacing-brand` → `tracking-brand`       |
| `--spacing-*`        | `p-*`, `m-*`, `gap-*`        | `--spacing-editorial` → `p-editorial`             |
| `--color-*`          | `bg-*`, `text-*`, `border-*` | `--color-theme-primary` → `bg-theme-primary`      |

## SSOT Implementation

### ✅ Correct Pattern (2025)

```css
/* tokens.css - @theme block */
@theme inline {
  /* Border Radius - SSOT */
  --border-radius-input: 24px;
  --border-radius-widget: 32px;
  --border-radius-editorial: 40px;
  --border-radius-editorial-lg: 48px;
  --border-radius-editorial-xl: 56px;
  --border-radius-editorial-2xl: 64px;

  /* Font Family - SSOT */
  --font-family-serif-title: 'Playfair Display', Georgia, serif;
  --font-family-mono-brand: ui-monospace, SFMono-Regular, monospace;

  /* Letter Spacing - SSOT */
  --letter-spacing-brand-sm: 0.2em;
  --letter-spacing-brand: 0.3em;
  --letter-spacing-brand-lg: 0.5em;
  --letter-spacing-editorial: -0.05em;
}
```

```tsx
// Component usage - Auto-generated utilities
<h1 className="font-serif-title tracking-editorial italic">
  Page Title
</h1>

<div className="rounded-editorial-lg border-2 p-10">
  Form Card
</div>

<span className="font-mono-brand tracking-brand uppercase">
  GIROK.
</span>
```

### ❌ Anti-Pattern (Current State)

```tsx
// Hardcoded pixel values - NOT SSOT
<div className="rounded-[48px]">  {/* ❌ Magic number */}

// Inline styles with CSS variables - Verbose
<h1 style={{ fontFamily: 'var(--font-family-serif-title)' }}>  {/* ❌ Inline style */}

// Arbitrary tracking values - NOT SSOT
<span className="tracking-[0.3em]">  {/* ❌ Magic number */}
```

## Migration Guide

### Border Radius

**Unified Radius Policy (2025-12)**: All cards, containers, form elements use `rounded-soft` (8px).

| Current (❌)                      | SSOT (✅)      | Token           | Value |
| --------------------------------- | -------------- | --------------- | ----- |
| `rounded-lg`, `rounded-xl`        | `rounded-soft` | `--radius-soft` | 8px   |
| `rounded-input`, `rounded-widget` | `rounded-soft` | `--radius-soft` | 8px   |
| `rounded-editorial*` (for cards)  | `rounded-soft` | `--radius-soft` | 8px   |

**Keep as-is:**

| Usage            | Class            | Token             | Value  |
| ---------------- | ---------------- | ----------------- | ------ |
| Circular avatars | `rounded-full`   | -                 | 9999px |
| Minimal corners  | `rounded-subtle` | `--radius-subtle` | 4px    |

### Typography

| Current (❌)                                               | SSOT (✅)                      | Token                        |
| ---------------------------------------------------------- | ------------------------------ | ---------------------------- |
| `style={{ fontFamily: 'var(--font-family-serif-title)' }}` | `className="font-serif-title"` | `--font-family-serif-title`  |
| `style={{ fontFamily: 'var(--font-family-mono-brand)' }}`  | `className="font-mono-brand"`  | `--font-family-mono-brand`   |
| `tracking-[0.2em]`, `tracking-[0.25em]`                    | `tracking-brand-sm`            | `--letter-spacing-brand-sm`  |
| `tracking-[0.25em]`                                        | `tracking-brand-md`            | `--letter-spacing-brand-md`  |
| `tracking-[0.3em]`                                         | `tracking-brand`               | `--letter-spacing-brand`     |
| `tracking-[0.4em]`, `tracking-[0.5em]`, `tracking-[0.6em]` | `tracking-brand-lg`            | `--letter-spacing-brand-lg`  |
| `tracking-tighter`                                         | `tracking-editorial`           | `--letter-spacing-editorial` |

### Navigation & Layout Spacing

| Current (❌)                                      | SSOT (✅) | Token           |
| ------------------------------------------------- | --------- | --------------- |
| `style={{ paddingTop: 'var(--nav-height-...)' }}` | `pt-nav`  | `--spacing-nav` |
| `style={{ height: 'var(--nav-height-...)' }}`     | `h-nav`   | `--spacing-nav` |

### Focus Ring (AAA Accessibility)

| Current (❌) | SSOT (✅)    | Spec                           |
| ------------ | ------------ | ------------------------------ |
| `ring-[3px]` | `ring-[4px]` | V0.0.1 spec: outline-width 4px |

### Brand Typography (SSOT)

| Current (❌)  | SSOT (✅)         | Token                    |
| ------------- | ----------------- | ------------------------ |
| `text-[10px]` | `text-brand-2xs`  | `--font-size-brand-2xs`  |
| `text-[11px]` | `text-brand-xs`   | `--font-size-brand-xs`   |
| `text-[12px]` | `text-brand-sm`   | `--font-size-brand-sm`   |
| `text-[13px]` | `text-brand-md`   | `--font-size-brand-md`   |
| `text-[14px]` | `text-brand-base` | `--font-size-brand-base` |
| `text-[15px]` | `text-brand-lg`   | `--font-size-brand-lg`   |
| `text-[16px]` | `text-brand-xl`   | `--font-size-brand-xl`   |
| `text-[18px]` | `text-brand-2xl`  | `--font-size-brand-2xl`  |

### Input Component Heights (SSOT)

| Current (❌)   | SSOT (✅)        | Token                   |
| -------------- | ---------------- | ----------------------- |
| `min-h-[44px]` | `min-h-touch-aa` | `--min-height-touch-aa` |
| `min-h-[48px]` | `min-h-input`    | `--spacing-input`       |
| `min-h-[56px]` | `min-h-input-lg` | `--min-height-input-lg` |
| `min-h-[64px]` | `min-h-input-xl` | `--min-height-input-xl` |

### 8pt Grid System Compliance

모든 spacing은 8의 배수 (아이콘은 4 허용):

| Tailwind Class | Value | 8pt Grid |
| -------------- | ----- | -------- |
| `py-2`         | 8px   | ✅       |
| `py-3`         | 12px  | ❌       |
| `py-4`         | 16px  | ✅       |
| `py-5`         | 20px  | ❌       |
| `py-6`         | 24px  | ✅       |
| `gap-2`        | 8px   | ✅       |
| `gap-3`        | 12px  | ❌       |
| `gap-4`        | 16px  | ✅       |
| `px-4`         | 16px  | ✅       |
| `px-5`         | 20px  | ❌       |
| `px-6`         | 24px  | ✅       |
| `px-7`         | 28px  | ❌       |
| `px-8`         | 32px  | ✅       |

**Icon Sizes (4px intervals):** 12, 16, 20, 24px

## Benefits

### 1. 관리포인트 최소화

```
Before: 19 files × hardcoded values = 19 management points
After:  1 file (tokens.css) = 1 management point
```

### 2. 타입 안전성

```bash
# Tailwind IntelliSense
rounded-editorial     ✅ Autocomplete
rounded-[48px]        ❌ No autocomplete, easy typos
```

### 3. 일관성 보장

디자인 토큰 변경 시 **한 곳만 수정**하면 전체 앱에 반영됩니다.

```css
/* 디자인 변경: 48px → 44px */
--border-radius-editorial-lg: 44px; /* 한 줄 수정 */
```

### 4. 문서화 자동화

`@theme` 블록이 곧 **디자인 토큰 문서**가 됩니다.

## Checklist

### tokens.css (@theme)

- [x] `--radius-*` → `--border-radius-*` 네이밍 변경
- [x] `--letter-spacing-brand: 0.3em` 추가
- [x] `--letter-spacing-brand-sm: 0.2em` 추가
- [x] `--letter-spacing-brand-md: 0.25em` 추가 (footer)
- [x] `--letter-spacing-brand-lg: 0.5em` 추가
- [x] `--letter-spacing-editorial: -0.05em` 추가
- [x] `--spacing-nav: 80px` 추가 (pt-nav, h-nav)

### Components

- [x] `rounded-[Npx]` → `rounded-*` 유틸리티로 교체
- [x] `style={{ fontFamily: ... }}` → `className="font-*"` 로 교체
- [x] `tracking-[Nem]` → `tracking-brand-*` 로 교체
- [x] `tracking-tighter` → `tracking-editorial` 로 교체
- [x] `style={{ paddingTop: 'var(--nav-height-...)' }}` → `pt-nav` 교체
- [x] `style={{ height: 'var(--nav-height-...)' }}` → `h-nav` 교체
- [x] `ring-[3px]` → `ring-[4px]` 교체 (AAA spec)
- [x] `strokeWidth={2}` or `{3}` → `strokeWidth={1.5}` 표준화
- [x] `text-[11px]` → `text-brand-xs` 교체
- [x] `text-[12px]` → `text-brand-sm` 교체
- [x] `text-[14px]` → `text-brand-base` 교체
- [x] `min-h-[44px]` → `min-h-touch-aa` 교체
- [x] `min-h-[48px]` → `min-h-input` 교체
- [x] `min-h-[56px]` → `min-h-input-lg` 교체
- [x] `min-h-[64px]` → `min-h-input-xl` 교체
- [x] 8pt Grid 위반 수정 (py-3→py-2, gap-3→gap-2, px-5→px-4/px-6, px-7→px-6)
- [x] **Unified Radius Migration (2025-12)**: `rounded-input`, `rounded-widget`, `rounded-editorial*` → `rounded-soft`

## File Impact

| File                                          | Status      | Changes                       |
| --------------------------------------------- | ----------- | ----------------------------- |
| `packages/design-tokens/src/tokens.css`       | ✅ Complete | SSOT variable prefixes        |
| `packages/ui-components/src/components/*.tsx` | ✅ Complete | All hardcoded values replaced |
| `apps/web-main/src/pages/*.tsx`               | ✅ Complete | All hardcoded values replaced |
| `apps/web-main/src/components/*.tsx`          | ✅ Complete | All hardcoded values replaced |

## References

- [Tailwind CSS 4 @theme: The Future of Design Tokens (2025)](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Design Tokens with Tailwind CSS: Complete Integration Guide 2025](https://nicolalazzari.ai/articles/integrating-design-tokens-with-tailwind-css)
- [Exploring Typesafe design tokens in Tailwind 4](https://dev.to/wearethreebears/exploring-typesafe-design-tokens-in-tailwind-4-372d)

## Version

**V0.0.1 AAA Workstation** (2025-12)
