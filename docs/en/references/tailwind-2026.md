# Tailwind CSS Best Practices - 2026

This guide covers Tailwind CSS best practices as of 2026, focusing on the v4 @theme directive, design tokens, and component patterns.

## Tailwind CSS 4 Overview

| Feature            | Description             |
| ------------------ | ----------------------- |
| `@theme` directive | CSS-first design tokens |
| CSS variables      | Native theme variables  |
| No JS config       | CSS-only configuration  |
| Smaller bundle     | Optimized output        |

## Design Token System

### @theme Directive

```css
@import 'tailwindcss';

@theme {
  /* Colors */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Playfair Display', serif;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}
```

### Generated Utilities

Tokens automatically generate utility classes:

```html
<div class="bg-primary-500 text-white p-md rounded-lg shadow-md">Token-based styling</div>

<h1 class="font-display text-2xl">Heading</h1>
<p class="font-sans text-base">Body text</p>
```

## Dark Mode

### CSS Variables Approach

```css
@theme {
  --color-bg: #ffffff;
  --color-text: #1f2937;
  --color-border: #e5e7eb;
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #111827;
    --color-text: #f9fafb;
    --color-border: #374151;
  }
}

/* Class-based dark mode */
.dark {
  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-border: #374151;
}
```

## Component Patterns

### Button Component with CVA

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-normal focus:outline-none focus:ring-2 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-secondary-600 text-white hover:bg-secondary-700',
        outline: 'border border-border bg-transparent hover:bg-primary-50',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-base rounded-lg',
        lg: 'h-12 px-6 text-lg rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export function Button({ className, variant, size, ...props }) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
```

## @theme vs :root

### When to Use @theme

```css
/* Use @theme for tokens that should generate utilities */
@theme {
  --color-brand: #3b82f6; /* Creates bg-brand, text-brand, etc. */
  --spacing-page: 2rem; /* Creates p-page, m-page, etc. */
}
```

### When to Use :root

```css
/* Use :root for variables without utility classes */
:root {
  --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
  --z-index-modal: 100;
  --max-content-width: 1200px;
}
```

## Migration from v3

| v3                    | v4                    |
| --------------------- | --------------------- |
| `tailwind.config.js`  | `@theme` in CSS       |
| `theme.extend.colors` | `--color-*` variables |
| `@apply`              | Still supported       |
| Plugins in JS         | `@plugin` directive   |

## Anti-Patterns to Avoid

| Don't            | Do                 | Reason          |
| ---------------- | ------------------ | --------------- |
| Inline styles    | Utility classes    | Consistency     |
| Deep nesting     | Flat utilities     | Specificity     |
| `!important`     | Proper specificity | Maintainability |
| Magic numbers    | Design tokens      | Consistency     |
| Overuse `@apply` | Utility-first      | Performance     |

## Sources

- [Tailwind CSS 4 @theme Guide](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Tailwind Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)
- [Tailwind Theme Variables](https://tailwindcss.com/docs/theme)
- [Design Token System Guide](https://hexshift.medium.com/how-to-build-a-design-token-system-for-tailwind-that-scales-forever-84c4c0873e6d)

---

_Last Updated: 2026-01-22_
