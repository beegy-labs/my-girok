# SSOT Strategy

> Single Source of Truth - Tailwind CSS 4

## Core Principle

```
tokens.css (@theme) → Tailwind Utility Classes → Components
```

## Key Tokens

| Utility            | Token                       | Value                    |
| ------------------ | --------------------------- | ------------------------ |
| `rounded-soft`     | `--radius-soft`             | 8px (default for ALL UI) |
| `font-serif-title` | `--font-family-serif-title` | Playfair Display         |
| `tracking-brand`   | `--letter-spacing-brand`    | 0.3em                    |
| `min-h-input`      | `--min-height-input`        | 48px (WCAG AAA)          |

## 8pt Grid

| Class  | Value | Grid |
| ------ | ----- | ---- |
| `py-2` | 8px   | ✅   |
| `py-3` | 12px  | ❌   |
| `py-4` | 16px  | ✅   |
| `px-6` | 24px  | ✅   |

## DO / DON'T

| ✅ DO            | ❌ DON'T                       |
| ---------------- | ------------------------------ |
| `rounded-soft`   | `rounded-lg`, `rounded-[24px]` |
| `tracking-brand` | `tracking-widest`              |
| `min-h-input`    | `min-h-[48px]`                 |

---

**Tokens**: `packages/design-tokens/src/tokens.css`
**Detailed docs**: `docs/DESIGN_SYSTEM.md`
