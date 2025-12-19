# Design System Principles (2025)

> **V0.0.1 AAA Workstation Design System** - 2025 Best Practices

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 4-LAYER TOKEN ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 0: @property Type Definitions (type safety)          │
│  Layer 1: Primitive Palette (raw colors, never use directly)│
│  Layer 2: Semantic Tokens (theme-switchable via data-theme) │
│  Layer 3: Tailwind @theme inline (auto-generated utilities) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              TAILWIND CSS 4 UTILITIES                       │
│  Auto-generated: bg-theme-*, rounded-*, tracking-*, etc.    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENTS                               │
│  Flexible structure (not strict Atomic Design hierarchy)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. SSOT (Single Source of Truth) - 필수

### Principle

**한 곳에서 정의하고, 어디서든 동일하게 사용한다.**

### Implementation

```
tokens.css (@theme)  →  Tailwind Utility Classes  →  Components
     ↑                         ↓
  Single Source            Auto-generated
```

### Rules

| DO (✅)                 | DON'T (❌)                     |
| ----------------------- | ------------------------------ |
| `rounded-input`         | `rounded-lg`, `rounded-[24px]` |
| `rounded-xl`            | `rounded-lg` (8px too small)   |
| `tracking-brand-lg`     | `tracking-widest`              |
| `tracking-editorial`    | `tracking-tighter`             |
| `ring-[4px]`            | `ring-2`, `ring-3`             |
| `focusClasses` constant | inline focus ring classes      |
| `font-serif-title`      | `style={{ fontFamily: ... }}`  |
| `strokeWidth={1.5}`     | `strokeWidth={2}` or `{3}`     |

### Token Mapping

#### Border Radius

| Tailwind Default | SSOT Token                | Size |
| ---------------- | ------------------------- | ---- |
| `rounded-lg`     | `rounded-xl` (acceptable) | 12px |
| `rounded-xl`     | `rounded-xl`              | 12px |
| `rounded-2xl`    | `rounded-input`           | 24px |
| `rounded-3xl`    | `rounded-widget`          | 32px |
| -                | `rounded-editorial`       | 40px |
| -                | `rounded-editorial-lg`    | 48px |

#### Letter Spacing

| Tailwind Default   | SSOT Token           | Value   |
| ------------------ | -------------------- | ------- |
| `tracking-tighter` | `tracking-editorial` | -0.05em |
| `tracking-wide`    | (acceptable)         | 0.025em |
| `tracking-widest`  | `tracking-brand-lg`  | 0.5em   |
| -                  | `tracking-brand-sm`  | 0.2em   |
| -                  | `tracking-brand`     | 0.3em   |

#### Focus Ring

| Old            | SSOT           | Notes             |
| -------------- | -------------- | ----------------- |
| `ring-2`       | `ring-[4px]`   | V0.0.1 spec       |
| `ring-3`       | `ring-[4px]`   | WCAG AAA          |
| inline classes | `focusClasses` | from constants.ts |

#### Form Input Labels

| Element    | Classes                                                     |
| ---------- | ----------------------------------------------------------- |
| Label      | `text-[12px] font-black uppercase tracking-brand mb-3 ml-1` |
| Input (lg) | `h-16 rounded-input border-2 font-bold`                     |
| Form       | `space-y-6` (24px gap between fields)                       |
| Buttons    | `h-14` (lg) or `h-16` (xl) with `tracking-brand`            |

#### Card Styling (Editorial)

| Size    | Token                   | Radius |
| ------- | ----------------------- | ------ |
| Default | `rounded-2xl`           | 16px   |
| Large   | `rounded-editorial`     | 40px   |
| XL      | `rounded-editorial-lg`  | 48px   |
| 2XL     | `rounded-editorial-2xl` | 64px   |

---

## 2. 4-Layer Token Architecture - 권장

### Layer 0: @property Type Definitions

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #6b4a2e;
}
```

**Benefits:**

- Type safety for CSS values
- Smooth color transitions
- Fallback values for invalid inputs

### Layer 1: Primitive Palette

```css
:root {
  --light-primary: #6b4a2e; /* Raw value */
  --dark-primary: #d0b080; /* Raw value */
}
```

**Rule:** Never use primitives directly in components.

### Layer 2: Semantic Tokens

```css
:root,
[data-theme='light'] {
  --theme-primary: var(--light-primary);
}

[data-theme='dark'] {
  --theme-primary: var(--dark-primary);
}
```

**Benefits:** Theme switching without component changes.

### Layer 3: Tailwind @theme inline

```css
@theme inline {
  --color-theme-primary: var(--theme-primary);
  --border-radius-input: 24px;
  --letter-spacing-brand: 0.3em;
}
```

**Benefits:** Auto-generates `bg-theme-primary`, `rounded-input`, `tracking-brand`.

---

## 3. Component Architecture - 유연하게 적용

### 2025 Approach

Atomic Design의 엄격한 계층(atoms/molecules/organisms)보다 **유연한 구조**를 권장합니다.

### Current Structure (Acceptable)

```
packages/ui-components/src/
├── components/           ← Flat structure
│   ├── Button.tsx        (primitive)
│   ├── TextInput.tsx     (primitive)
│   ├── Card.tsx          (composed)
│   ├── MenuCard.tsx      (pattern)
│   └── TopWidget.tsx     (pattern)
├── hooks/
└── styles/
    └── constants.ts      ← focusClasses SSOT
```

### Optional Reorganization

```
packages/ui-components/src/
├── primitives/           ← Basic elements
│   ├── Button.tsx
│   ├── Badge.tsx
│   └── inputs/
├── composed/             ← Combined primitives
│   ├── Card.tsx
│   └── Alert.tsx
├── patterns/             ← Complex, opinionated
│   ├── MenuCard.tsx
│   ├── MenuRow.tsx
│   └── TopWidget.tsx
└── tokens/
    └── constants.ts
```

### When to Use Atomic Design

| Use Case               | Recommendation                    |
| ---------------------- | --------------------------------- |
| UI-focused projects    | ✅ Atomic Design works well       |
| Complex business logic | ⚠️ Consider Feature-Sliced Design |
| Small marketing sites  | ❌ Overkill                       |

---

## 4. Accessibility (WCAG 2.1 AAA) - 필수

### Color Contrast

| Element       | Minimum Ratio | Our Target |
| ------------- | ------------- | ---------- |
| Body text     | 7:1 (AAA)     | 9:1+       |
| Large text    | 4.5:1 (AAA)   | 7:1+       |
| UI components | 3:1           | 3:1+       |

### Touch Targets

```tsx
// Minimum 44x44px for all interactive elements
className = 'min-h-[44px] min-w-[44px]';
```

### Focus Ring

```tsx
// SSOT: 4px ring with 4px offset
import { focusClasses } from '../styles/constants';

// focusClasses = 'focus-visible:outline-none focus-visible:ring-[4px]
//                 focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4'
```

### Icon Stroke Width

```tsx
// Standardized to 1.5 for visual consistency
<Icon strokeWidth={1.5} />
```

### HTML5 Semantic Structure

**Mandatory for all pages:**

| Rule                    | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| One `<main>` per page   | Each page component must have exactly ONE `<main>` element |
| `<footer>` sibling      | Footer must be sibling of `<main>`, not child              |
| Layout provides wrapper | MainLayout/FullWidthLayout provide `<div>` wrapper only    |
| Pages own semantics     | Pages are responsible for `<main>` and `<footer>` elements |

```tsx
// ✅ CORRECT: Standard page structure
<>
  <main className="min-h-screen bg-theme-bg-page pt-nav">
    {/* Page content */}
  </main>
  <Footer />
</>

// ❌ WRONG: Nested main tags
<main>  {/* Layout */}
  <main>  {/* Page - creates nested main! */}
  </main>
</main>

// ❌ WRONG: Footer inside main
<main>
  <Footer />  {/* Should be outside main */}
</main>
```

---

## 5. Performance Best Practices - 권장

### Static Class Definitions

```tsx
// ✅ Define outside component (2025 best practice)
const baseClasses = 'px-4 py-2 rounded-input';

function Button() {
  return <button className={baseClasses}>...</button>;
}
```

### React.memo for List Items

```tsx
// ✅ Use memo for components rendered in lists
export const MenuCard = memo(function MenuCard(props) {
  // ...
});
```

### useCallback for Event Handlers

```tsx
// ✅ Memoize handlers passed to children
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

---

## Quick Reference

### File Locations

| Purpose            | Location                                         |
| ------------------ | ------------------------------------------------ |
| Design tokens      | `packages/design-tokens/src/tokens.css`          |
| Focus classes      | `packages/ui-components/src/styles/constants.ts` |
| UI components      | `packages/ui-components/src/components/`         |
| SSOT documentation | `.ai/ssot.md`                                    |

### Key Tokens

| Token                        | Utility Class        | Value   |
| ---------------------------- | -------------------- | ------- |
| `--border-radius-input`      | `rounded-input`      | 24px    |
| `--border-radius-widget`     | `rounded-widget`     | 32px    |
| `--border-radius-editorial`  | `rounded-editorial`  | 40px    |
| `--letter-spacing-brand`     | `tracking-brand`     | 0.3em   |
| `--letter-spacing-brand-lg`  | `tracking-brand-lg`  | 0.5em   |
| `--letter-spacing-editorial` | `tracking-editorial` | -0.05em |
| `--spacing-nav`              | `pt-nav`, `h-nav`    | 80px    |

---

## Migration Checklist

### Components

- [ ] Replace `rounded-lg` with `rounded-xl`
- [ ] Replace `rounded-2xl` with `rounded-input`
- [ ] Replace `rounded-3xl` with `rounded-widget`
- [ ] Replace `tracking-widest` with `tracking-brand-lg`
- [ ] Replace `tracking-tighter` with `tracking-editorial`
- [ ] Replace `ring-2`/`ring-3` with `ring-[4px]`
- [ ] Use `focusClasses` constant for focus states
- [ ] Use `strokeWidth={1.5}` for all icons

### Verification

```bash
# Search for violations
grep -r "rounded-lg" apps/web-main/src/
grep -r "tracking-widest" apps/web-main/src/
grep -r "ring-2" apps/web-main/src/
```

---

## References

- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS 4 @theme: The Future of Design Tokens (2025)](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Design Tokens with Tailwind CSS: Complete Integration Guide 2025](https://nicolalazzari.ai/articles/integrating-design-tokens-with-tailwind-css)
- [Atomic Design in 2025: From Rigid Theory to Flexible Practice](https://medium.com/design-bootcamp/atomic-design-in-2025-from-rigid-theory-to-flexible-practice-91f7113b9274)
- [Atomic Design and Its Relevance in Frontend in 2025](https://dev.to/m_midas/atomic-design-and-its-relevance-in-frontend-in-2025-32e9)

---

**Version:** V0.0.1 AAA Workstation (2025-12)
