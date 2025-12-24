# SSOT Strategy

> Single Source of Truth - 2025 Tailwind CSS 4 Best Practices

## Core Principle

```
tokens.css (@theme)  →  Tailwind Utility Classes  →  Components
     ↑                         ↓
  Single Source            Auto-generated
```

## @theme Naming Convention

| CSS Variable Prefix  | Generated Utility     | Example            |
| -------------------- | --------------------- | ------------------ |
| `--border-radius-*`  | `rounded-*`           | `rounded-input`    |
| `--font-family-*`    | `font-*`              | `font-serif-title` |
| `--letter-spacing-*` | `tracking-*`          | `tracking-brand`   |
| `--spacing-*`        | `p-*`, `m-*`, `gap-*` | `pt-nav`           |
| `--color-*`          | `bg-*`, `text-*`      | `bg-theme-primary` |

## Migration Guide

### Border Radius

| Current                           | SSOT           | Token           | Value |
| --------------------------------- | -------------- | --------------- | ----- |
| `rounded-lg`, `rounded-xl`        | `rounded-soft` | `--radius-soft` | 8px   |
| `rounded-input`, `rounded-widget` | `rounded-soft` | `--radius-soft` | 8px   |
| `rounded-editorial*`              | `rounded-soft` | `--radius-soft` | 8px   |

### Typography

| Current                       | SSOT                 | Token                        |
| ----------------------------- | -------------------- | ---------------------------- |
| `style={{ fontFamily: ... }}` | `font-serif-title`   | `--font-family-serif-title`  |
| `tracking-[0.3em]`            | `tracking-brand`     | `--letter-spacing-brand`     |
| `tracking-tighter`            | `tracking-editorial` | `--letter-spacing-editorial` |

### Font Sizes (Brand)

| Current       | SSOT              | Token                    |
| ------------- | ----------------- | ------------------------ |
| `text-[11px]` | `text-brand-xs`   | `--font-size-brand-xs`   |
| `text-[12px]` | `text-brand-sm`   | `--font-size-brand-sm`   |
| `text-[14px]` | `text-brand-base` | `--font-size-brand-base` |

### Input Heights

| Current        | SSOT             | Token                   |
| -------------- | ---------------- | ----------------------- |
| `min-h-[44px]` | `min-h-touch-aa` | `--min-height-touch-aa` |
| `min-h-[48px]` | `min-h-input`    | `--spacing-input`       |
| `min-h-[56px]` | `min-h-input-lg` | `--min-height-input-lg` |

## 8pt Grid Compliance

| Class  | Value | Grid |
| ------ | ----- | ---- |
| `py-2` | 8px   | ✅   |
| `py-3` | 12px  | ❌   |
| `py-4` | 16px  | ✅   |
| `px-5` | 20px  | ❌   |
| `px-6` | 24px  | ✅   |

**Icon Sizes (4px intervals):** 12, 16, 20, 24px

## Benefits

| Before                      | After                    |
| --------------------------- | ------------------------ |
| 19 files × hardcoded values | 1 file (tokens.css)      |
| No autocomplete             | Full IntelliSense        |
| Manual sync                 | Single change propagates |

---

**Version:** V0.0.1 AAA Workstation (2025-12)
