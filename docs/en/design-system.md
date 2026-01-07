# Design System

> V0.0.1 AAA Workstation - WCAG 2.1 AAA Compliance Design System

## Visual Style

| Element      | Specification                     |
| ------------ | --------------------------------- |
| Card Radius  | 48px for forms, 64px for sections |
| Border Width | 2px for interactive elements      |
| Padding      | `p-10 md:p-14` for cards          |
| Touch Target | 44px minimum, 56px for prominent  |
| Focus Ring   | 4px width, 4px offset             |
| Nav Height   | 80px                              |

## Typography

| Element     | Styling                                              |
| ----------- | ---------------------------------------------------- |
| Hero Title  | `text-[10rem] italic tracking-tighter serif`         |
| Page Title  | `text-4xl sm:text-5xl italic tracking-tighter serif` |
| Card Title  | `text-2xl font-bold`                                 |
| Badge       | `text-[11px] font-black uppercase tracking-[0.3em]`  |
| Input Label | `text-xs font-bold uppercase tracking-widest`        |

**Font Stack**:

- Title: Playfair Display (italic)
- Brand: System monospace

## Theme Architecture

```
Layer 0: @property definitions  → Type safety
Layer 1: Palette (--palette-*)  → Raw color values
Layer 2: Semantic (--theme-*)   → Theme-switchable tokens
Layer 3: Tailwind               → bg-theme-*, text-theme-*
```

## Color Palette

### Light Mode (Clean White Oak)

| Token          | Value   | Contrast Ratio |
| -------------- | ------- | -------------- |
| Primary Text   | #262220 | 15.76:1        |
| Secondary Text | #4A4744 | 9.23:1         |
| Primary Accent | #6B4A2E | 7.94:1         |

### Dark Mode (Midnight Gentle Study)

| Token          | Value   | Contrast Ratio |
| -------------- | ------- | -------------- |
| Primary Text   | #CCC5BD | 9.94:1         |
| Secondary Text | #B4ADA5 | 7.65:1         |
| Primary Accent | #D0B080 | 8.25:1         |

All color combinations meet **WCAG 2.1 AAA** (7:1+ contrast ratio).

## Radius Tokens

| Token                 | Size | Usage                       |
| --------------------- | ---- | --------------------------- |
| rounded-soft          | 8px  | Default for all UI elements |
| rounded-input         | 24px | Large input fields          |
| rounded-editorial-lg  | 48px | Form cards                  |
| rounded-editorial-2xl | 64px | Section containers          |

## Button Sizes

| Size  | Height | Styling                         |
| ----- | ------ | ------------------------------- |
| sm/md | 44px   | Standard touch target           |
| lg    | 56px   | `font-black uppercase`          |
| xl    | 64px   | `font-black uppercase tracking` |

## HTML5 Semantic Structure

```tsx
<>
  <main className="min-h-screen pt-nav">{/* Page content */}</main>
  <Footer /> {/* Sibling to main, not child */}
</>
```

**Rules**:

- One `<main>` element per page
- Never nest `<main>` elements
- `<Footer>` should be outside `<main>`

## Accessibility Requirements

- All interactive elements must meet 44px minimum touch target
- Focus states must be visible with 4px ring
- Color contrast must meet WCAG 2.1 AAA (7:1)
- Semantic HTML structure required

---

**LLM Reference**: `docs/llm/DESIGN_SYSTEM.md`
