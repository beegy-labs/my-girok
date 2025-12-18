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
  --border-radius-editorial: 40px;
  --border-radius-editorial-lg: 48px;
  --border-radius-editorial-xl: 56px;
  --border-radius-editorial-2xl: 64px;

  /* Font Family - SSOT */
  --font-family-serif-title: 'Playfair Display', Georgia, serif;
  --font-family-mono-brand: ui-monospace, SFMono-Regular, monospace;

  /* Letter Spacing - SSOT */
  --letter-spacing-brand: 0.3em;
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

| Current (❌)     | SSOT (✅)               | Token                           |
| ---------------- | ----------------------- | ------------------------------- |
| `rounded-[24px]` | `rounded-input`         | `--border-radius-input`         |
| `rounded-[40px]` | `rounded-editorial`     | `--border-radius-editorial`     |
| `rounded-[48px]` | `rounded-editorial-lg`  | `--border-radius-editorial-lg`  |
| `rounded-[56px]` | `rounded-editorial-xl`  | `--border-radius-editorial-xl`  |
| `rounded-[64px]` | `rounded-editorial-2xl` | `--border-radius-editorial-2xl` |

### Typography

| Current (❌)                                               | SSOT (✅)                      | Token                        |
| ---------------------------------------------------------- | ------------------------------ | ---------------------------- |
| `style={{ fontFamily: 'var(--font-family-serif-title)' }}` | `className="font-serif-title"` | `--font-family-serif-title`  |
| `style={{ fontFamily: 'var(--font-family-mono-brand)' }}`  | `className="font-mono-brand"`  | `--font-family-mono-brand`   |
| `tracking-[0.3em]`                                         | `tracking-brand`               | `--letter-spacing-brand`     |
| `tracking-tighter`                                         | `tracking-editorial`           | `--letter-spacing-editorial` |

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

- [ ] `--radius-*` → `--border-radius-*` 네이밍 변경
- [ ] `--letter-spacing-brand: 0.3em` 추가
- [ ] `--letter-spacing-editorial: -0.05em` 추가

### Components

- [ ] `rounded-[Npx]` → `rounded-*` 유틸리티로 교체
- [ ] `style={{ fontFamily: ... }}` → `className="font-*"` 로 교체
- [ ] `tracking-[0.3em]` → `tracking-brand` 로 교체
- [ ] `tracking-tighter` → `tracking-editorial` 로 교체 (optional)

## File Impact

| File                                    | Changes Required             |
| --------------------------------------- | ---------------------------- |
| `packages/design-tokens/src/tokens.css` | Rename CSS variable prefixes |
| `apps/web-main/src/pages/*.tsx`         | Replace hardcoded values     |
| `apps/web-main/src/components/*.tsx`    | Replace hardcoded values     |

## References

- [Tailwind CSS 4 @theme: The Future of Design Tokens (2025)](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Design Tokens with Tailwind CSS: Complete Integration Guide 2025](https://nicolalazzari.ai/articles/integrating-design-tokens-with-tailwind-css)
- [Exploring Typesafe design tokens in Tailwind 4](https://dev.to/wearethreebears/exploring-typesafe-design-tokens-in-tailwind-4-372d)

## Version

**V0.0.1 AAA Workstation** (2025-12)
