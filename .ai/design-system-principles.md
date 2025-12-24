# Design System Principles

> V0.0.1 AAA Workstation - WCAG 2.1 AAA Compliance

## 4-Layer Token Architecture

```
Layer 0: @property definitions  → Type safety
Layer 1: Primitive Palette      → Raw colors (never use directly)
Layer 2: Semantic Tokens        → Theme-switchable (data-theme)
Layer 3: Tailwind @theme inline → bg-theme-*, rounded-*, etc.
```

## SSOT Rules

| Do                             | Don't                          |
| ------------------------------ | ------------------------------ |
| `rounded-input` (24px)         | `rounded-lg`, `rounded-[24px]` |
| `rounded-widget` (32px)        | `rounded-3xl`                  |
| `tracking-brand` (0.3em)       | `tracking-widest`              |
| `tracking-editorial` (-0.05em) | `tracking-tighter`             |
| `ring-[4px]`                   | `ring-2`, `ring-3`             |
| `focusClasses` constant        | inline focus ring classes      |
| `strokeWidth={1.5}`            | `strokeWidth={2}`              |

## Key Tokens

| Token         | Utility                 | Size |
| ------------- | ----------------------- | ---- |
| Border radius | `rounded-input`         | 24px |
| Border radius | `rounded-widget`        | 32px |
| Border radius | `rounded-editorial`     | 40px |
| Border radius | `rounded-editorial-lg`  | 48px |
| Border radius | `rounded-editorial-2xl` | 64px |
| Spacing       | `pt-nav`, `h-nav`       | 80px |

## Accessibility (AAA)

| Element       | Min Ratio | Target |
| ------------- | --------- | ------ |
| Body text     | 7:1       | 9:1+   |
| Large text    | 4.5:1     | 7:1+   |
| UI components | 3:1       | 3:1+   |

### Touch Targets

```tsx
className = 'min-h-[44px] min-w-[44px]'; // Minimum
```

### Focus Ring

```tsx
import { focusClasses } from '../styles/constants';
// 4px ring, 4px offset (AAA spec)
```

## HTML5 Semantics

```tsx
// ✅ Correct page structure
<>
  <main className="min-h-screen pt-nav">{/* Content */}</main>
  <Footer />
</>

// ❌ Wrong: nested main or footer inside main
```

## Performance

```tsx
// Static classes outside component
const baseClasses = 'px-4 py-2 rounded-input';

// React.memo for list items
export const MenuCard = memo(function MenuCard(props) { ... });

// useCallback for handlers
const handleClick = useCallback(() => { ... }, [deps]);
```

## File Locations

| Purpose       | Location                                         |
| ------------- | ------------------------------------------------ |
| Design tokens | `packages/design-tokens/src/tokens.css`          |
| Focus classes | `packages/ui-components/src/styles/constants.ts` |
| UI components | `packages/ui-components/src/components/`         |

---

**Full guide**: `docs/DESIGN_SYSTEM.md`
