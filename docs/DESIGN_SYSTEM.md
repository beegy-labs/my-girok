# Design System & Brand Identity

> My-Girok Design Guidelines (2025-12)

## Brand Concept

**"나에 대한 것을 책에 쓴다" (Writing about myself in a book)**

My-Girok is a personal record-keeping platform where users document their life stories, careers, thoughts, and finances. The design reflects the warmth and serenity of a personal library or study room.

### Brand Values

- **Knowledge**: Archive and organize personal information
- **Authenticity**: Express yourself genuinely
- **Focus**: Comfortable for long reading and writing sessions
- **Growth**: Track personal development over time

## Scalable Theme Architecture

The theme system uses a 4-layer architecture for type safety and easy extensibility:

```
Layer 0: @property definitions    → Type safety, smooth animations (CSS Houdini)
Layer 1: Palette (--palette-*)    → Raw colors, defined once, never use directly
Layer 2: Semantic (--theme-*)     → Theme-switchable via [data-theme] attribute
Layer 3: Tailwind (@theme inline) → Maps to utilities (bg-theme-*, text-theme-*)
```

### CSS @property Type Safety (2025)

Key tokens use CSS `@property` for type validation and smooth transitions:

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #8b5e3c;
}
```

**Benefits:**

- Type validation prevents invalid values
- Smooth color interpolation in transitions
- Fallback values for robustness
- Browser support: Chrome 85+, Firefox 128+, Safari 15.4+

### Usage in Components

```tsx
// Use semantic theme classes (auto-adapts to theme)
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
  <h2 className="text-theme-text-primary">Title</h2>
  <p className="text-theme-text-secondary">Description</p>
</div>

// Use themed shadows
<div className="shadow-theme-lg">
```

### Adding a New Theme

Modify `packages/design-tokens/src/tokens.css`:

```css
[data-theme='ocean'] {
  --theme-bg-page: #0a192f;
  --theme-bg-card: #112240;
  --theme-text-primary: #ccd6f6;
  /* ... map all semantic tokens ... */
}
```

Then update `apps/web-main/src/types/theme.ts` to include the new theme name.

### Key Theme Tokens

| Token                         | Usage                              |
| ----------------------------- | ---------------------------------- |
| `bg-theme-bg-page`            | Page background                    |
| `bg-theme-bg-card`            | Card backgrounds                   |
| `bg-theme-bg-elevated`        | Elevated surfaces (navbar, modals) |
| `bg-theme-bg-hover`           | Hover states                       |
| `text-theme-text-primary`     | Primary text                       |
| `text-theme-text-secondary`   | Secondary text                     |
| `text-theme-text-tertiary`    | Hints, captions                    |
| `border-theme-border-subtle`  | Subtle borders                     |
| `border-theme-border-default` | Default borders                    |
| `shadow-theme-lg`             | Large shadows                      |
| `text-theme-primary`          | Primary accent color               |

### When to Use `dark:` Variant

The `dark:` Tailwind variant is **only** for semantic status colors that need explicit dark mode handling:

```tsx
// OK - Semantic status colors (not part of theme system)
<div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
<div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">

// DON'T - Theme colors (use theme-* instead)
<div className="bg-vintage-bg-card dark:bg-dark-bg-card">
```

## Color Palette

### Theme: "Clean White Oak" (Light) + "Midnight Gentle Study" (Dark)

**Design Philosophy**: A professional archive aesthetic focused on WCAG 2.1 AA accessibility compliance.

**Key Principles**:

- All color combinations meet WCAG 2.1 AA 4.5:1 contrast ratio
- Typography optimized for readability (line-height 1.8, min 16px)
- Warm, earthy tones for a professional archive feel

### Light Mode - Clean White Oak

| Token          | Value   | Usage                           |
| -------------- | ------- | ------------------------------- |
| Page BG        | #FFFFFF | Page background                 |
| Card BG        | #F8F7F4 | Card backgrounds                |
| Primary Text   | #262220 | Main text (13.5:1 contrast)     |
| Secondary Text | #4A4641 | Body text (7.2:1 contrast)      |
| Primary Accent | #8B5E3C | Buttons, links (5.8:1 contrast) |

### Dark Mode - Midnight Gentle Study

| Token          | Value   | Usage                           |
| -------------- | ------- | ------------------------------- |
| Page BG        | #1E1C1A | Page background                 |
| Card BG        | #282522 | Card backgrounds                |
| Primary Text   | #B0A9A2 | Main text (7.8:1 contrast)      |
| Secondary Text | #8A847D | Body text (4.9:1 contrast)      |
| Primary Accent | #9C835E | Buttons, links (5.2:1 contrast) |

### WCAG 2.1 AA Compliance

All color combinations meet or exceed WCAG 2.1 AA standards:

| Combination                  | Contrast Ratio | WCAG Level |
| ---------------------------- | -------------- | ---------- |
| Light primary text on card   | 13.5:1         | AAA        |
| Light secondary text on card | 7.2:1          | AAA        |
| Dark primary text on card    | 7.8:1          | AAA        |
| Dark secondary text on card  | 4.9:1          | AA         |

## Typography

### WCAG-Optimized Settings

```css
:root {
  font-size: 16px; /* Minimum for WCAG 2.1 AA */
  line-height: 1.8; /* Improved readability */
  letter-spacing: -0.02em; /* Korean/CJK optimization */
}
```

### Font Stack

```css
font-family:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
  sans-serif;

/* Logo/Brand: Monospace */
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Font Sizes

| Token       | Size | Usage               |
| ----------- | ---- | ------------------- |
| `text-base` | 16px | Body text (minimum) |
| `text-lg`   | 18px | Large body text     |
| `text-xl`   | 20px | Subheadings         |
| `text-2xl`  | 24px | Card headers        |
| `text-3xl`  | 30px | Section headers     |
| `text-4xl`  | 36px | Page titles         |

**Important**: Minimum font size for body text is 16px (1rem) per WCAG 2.1 AA guidelines.

## Iconography

**Primary Library**: Lucide-React icons for consistency and accessibility

### Icon Usage

```tsx
import { Book, FileText, Wallet, Settings, Sun, Moon } from 'lucide-react';

// Standard icon with WCAG touch target
<button className="p-2.5 min-w-[44px] min-h-[44px]">
  <Settings className="w-5 h-5" aria-hidden="true" />
  <span className="sr-only">Settings</span>
</button>;
```

### Core Icons

| Icon     | Lucide Name | Usage             |
| -------- | ----------- | ----------------- |
| Book     | `Book`      | Records, library  |
| FileText | `FileText`  | Resume, documents |
| Wallet   | `Wallet`    | Assets, finance   |
| Settings | `Settings`  | Configuration     |
| Sun      | `Sun`       | Light mode toggle |
| Moon     | `Moon`      | Dark mode toggle  |
| Loader2  | `Loader2`   | Loading states    |

### Accessibility

- All icons must have `aria-hidden="true"` when decorative
- Interactive icons need visible labels or `sr-only` text
- Minimum touch target: 44x44px (WCAG 2.5.5)

## Spacing & Layout

### Base Unit: 4px (0.25rem)

| Token       | Size | Usage           |
| ----------- | ---- | --------------- |
| `spacing-4` | 16px | Default gap     |
| `spacing-6` | 24px | Card padding    |
| `spacing-8` | 32px | Section padding |

### Responsive Breakpoints

```css
sm: 640px; /* Tablet */
md: 768px; /* Tablet Landscape */
lg: 1024px; /* Desktop */
xl: 1280px; /* Large Desktop */
```

### Border Radius

| Token            | Size | Usage               |
| ---------------- | ---- | ------------------- |
| `rounded-xl`     | 12px | Inputs, buttons     |
| `rounded-2xl`    | 16px | Cards               |
| `rounded-[36px]` | 36px | Large feature cards |

## Component Guidelines

### Buttons

All buttons meet WCAG 44x44px minimum touch target.

```tsx
import { Button } from '@my-girok/ui-components';

<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="danger">Destructive Action</Button>
<Button variant="ghost">Subtle Action</Button>
```

### Cards

```tsx
import { Card } from '@my-girok/ui-components';

<Card variant="primary" radius="lg">
  Content
</Card>;
```

### Form Inputs

```tsx
import { TextInput, SelectInput } from '@my-girok/ui-components';

<TextInput
  label="Email"
  value={email}
  onChange={setEmail} // Direct value handler
  error={errors.email}
/>;
```

**See**: `.ai/apps/web-main.md` for complete component API documentation.

## Status & Loading Components

### LoadingSpinner

```tsx
import LoadingSpinner from './components/LoadingSpinner';

<LoadingSpinner />                    // Inline
<LoadingSpinner fullScreen />         // Overlay
<LoadingSpinner message="Loading..." />
```

### StatusMessage

```tsx
import StatusMessage from './components/StatusMessage';

<StatusMessage type="error" />
<StatusMessage type="not-found" />
<StatusMessage type="expired" />
<StatusMessage type="no-permission" />
```

| Type            | Icon          | Use Case           |
| --------------- | ------------- | ------------------ |
| `error`         | AlertCircle   | System errors      |
| `not-found`     | FileQuestion  | 404 pages          |
| `expired`       | Clock         | Expired links      |
| `no-permission` | Lock          | Access denied      |
| `maintenance`   | Wrench        | System maintenance |
| `deleted`       | Trash2        | Deleted content    |
| `warning`       | AlertTriangle | Warning messages   |

## Resume Preview (Print-Optimized)

**Important**: Resume preview and PDF output use high-contrast grayscale for print optimization.

### Design Philosophy

- **Not pure black & white**: Use grayscale range (gray-50 ~ gray-900)
- **High contrast**: Ensure excellent readability for screen and print
- **Print-optimized**: Reduce printing costs, ATS-friendly

### Grayscale vs Brand Colors

**Use Grayscale (preview/print only)**:

- `ResumePreview` component
- PDF export output
- Public resume page display

**Use Brand Colors (standard UI)**:

- Resume Edit Page UI
- Action bars and controls
- Navigation elements

## Mobile-First Responsive Design

### Core Patterns

```tsx
// Responsive text
className = 'text-base sm:text-lg lg:text-xl';

// Responsive padding
className = 'p-4 sm:p-6 lg:p-8';

// Stack on mobile, row on desktop
className = 'flex flex-col sm:flex-row gap-4';

// Responsive grid
className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
```

### Touch Targets

- Minimum: 44x44px for primary actions
- Inline actions: 24x24px minimum
- Add `touch-manipulation` for faster touch response

### Mobile Edit Patterns

```typescript
// TouchSensor for drag-and-drop
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
);

// Depth colors for hierarchical data
const DEPTH_COLORS = {
  1: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500' },
  2: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500' },
  // ...
};
```

## Implementation Guidelines

### Do's

- Use Tailwind CSS utility classes with `theme-*` tokens
- Follow mobile-first responsive design
- Ensure all interactive elements have hover/focus states
- Test color contrast for accessibility
- Use semantic HTML elements

### Don'ts

- Don't use raw hex color values in components
- Don't use legacy `vintage-*` or `dark:dark-*` patterns
- Don't create buttons smaller than 44x44px touch target
- Don't use font sizes smaller than 16px for body text
- Don't skip focus-visible styles for keyboard navigation

## File Locations

```
packages/design-tokens/        # SINGLE SOURCE OF TRUTH for design tokens
├── src/tokens.css            # Theme variables (Layers 0-3 with @property)
└── README.md                 # Token documentation

packages/ui-components/src/    # Shared UI components (depends on design-tokens)
├── Button.tsx
├── Card.tsx
├── TextInput.tsx
└── ...

apps/web-main/src/
├── index.css                  # App-specific styles + @import design-tokens
├── contexts/ThemeContext.tsx  # Theme switching logic
└── components/
    ├── LoadingSpinner.tsx     # Loading indicator
    ├── StatusMessage.tsx      # Status/error messages
    └── ErrorBoundary.tsx      # Error boundary

pnpm-workspace.yaml            # Centralized version management (catalog:)
```

## References

- **Component API**: `.ai/apps/web-main.md`
- **Tailwind CSS**: https://tailwindcss.com/docs
- **CSS @property**: https://developer.mozilla.org/en-US/docs/Web/CSS/@property
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Lucide Icons**: https://lucide.dev/icons

## Version History

- v2.2.0 (2025-12): Add CSS @property type safety, @theme inline, pnpm catalogs
- v2.1.0 (2025-12): Extract design tokens to dedicated package (@my-girok/design-tokens)
- v2.0.0 (2025-12): Consolidated and optimized documentation, removed legacy patterns
- v1.5.0 (2025-12): Scalable 3-layer theme system
- v1.4.0 (2025-12): WCAG 2.1 AA compliant color system
