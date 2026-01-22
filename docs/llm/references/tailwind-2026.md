# Tailwind CSS - 2026 Best Practices

> Design tokens, @theme directive, component patterns | **Researched**: 2026-01-22

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
/* src/styles/tokens.css */
@import 'tailwindcss';

@theme {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  --color-secondary-500: #8b5cf6;
  --color-secondary-600: #7c3aed;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Playfair Display', serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

### Generated Utilities

```html
<!-- Tokens automatically generate utility classes -->
<div class="bg-primary-500 text-white p-md rounded-lg shadow-md">Token-based styling</div>

<!-- Typography -->
<h1 class="font-display text-2xl">Heading</h1>
<p class="font-sans text-base">Body text</p>

<!-- Spacing -->
<div class="space-y-md p-lg">Content</div>
```

## Dark Mode

### CSS Variables Approach

```css
@theme {
  /* Light mode (default) */
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

### Usage

```html
<html class="dark">
  <body class="bg-bg text-text">
    <div class="border border-border">Automatic dark mode support</div>
  </body>
</html>
```

## Component Patterns

### Button Component

```tsx
// components/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center font-medium transition-normal focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
        secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
        outline: 'border border-border bg-transparent hover:bg-primary-50',
        ghost: 'hover:bg-primary-50',
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

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
```

### Card Component

```tsx
// components/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-bg border border-border rounded-lg shadow-sm ${className}`}>{children}</div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`p-md border-b border-border ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`p-md ${className}`}>{children}</div>;
}
```

## Responsive Design

### Responsive Tokens

```css
@theme {
  /* Mobile-first spacing */
  --spacing-container: 1rem;

  @media (min-width: 640px) {
    --spacing-container: 1.5rem;
  }

  @media (min-width: 1024px) {
    --spacing-container: 2rem;
  }
}
```

### Breakpoint Usage

```html
<!-- Mobile-first responsive design -->
<div
  class="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
  gap-md
"
>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
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

## Plugin Integration

### Typography Plugin

```css
/* tailwind.config.css equivalent in v4 */
@import 'tailwindcss';
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";

@theme {
  --prose-headings: var(--color-text);
  --prose-links: var(--color-primary-600);
}
```

### Custom Plugin

```css
@plugin "my-plugin" {
  .btn-gradient {
    background: linear-gradient(to right, var(--color-primary-500), var(--color-secondary-500));
  }
}
```

## Storybook Integration

### Design Token Documentation

```tsx
// stories/DesignTokens.stories.tsx
export const Colors = () => (
  <div className="grid grid-cols-5 gap-md">
    {['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((shade) => (
      <div
        key={shade}
        className={`bg-primary-${shade} h-16 rounded-md flex items-center justify-center`}
      >
        <span className={Number(shade) > 400 ? 'text-white' : 'text-black'}>{shade}</span>
      </div>
    ))}
  </div>
);

export const Spacing = () => (
  <div className="space-y-md">
    {['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((size) => (
      <div key={size} className="flex items-center gap-md">
        <span className="w-12">{size}</span>
        <div className={`bg-primary-500 h-4 p-${size}`} />
      </div>
    ))}
  </div>
);
```

## Performance

### Purge Configuration

```css
/* Tailwind 4 auto-detects content files */
/* For explicit configuration: */
@config "./tailwind.config.ts";
```

### Minimize Custom CSS

```css
/* ❌ Avoid excessive custom CSS */
.my-custom-button {
  padding: 0.5rem 1rem;
  background: blue;
}

/* ✅ Use Tailwind utilities */
/* <button class="px-md py-sm bg-primary-500">Click</button> */
```

## Migration from v3

### Key Changes

| v3                    | v4                    |
| --------------------- | --------------------- |
| `tailwind.config.js`  | `@theme` in CSS       |
| `theme.extend.colors` | `--color-*` variables |
| `@apply`              | Still supported       |
| Plugins in JS         | `@plugin` directive   |

### Migration Steps

```
1. Replace tailwind.config.js with @theme
2. Convert color/spacing values to CSS variables
3. Update plugin syntax to @plugin
4. Test all components
```

## Anti-Patterns

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
- [Typesafe Design Tokens](https://dev.to/wearethreebears/exploring-typesafe-design-tokens-in-tailwind-4-372d)
- [Design Token System Guide](https://hexshift.medium.com/how-to-build-a-design-token-system-for-tailwind-that-scales-forever-84c4c0873e6d)
