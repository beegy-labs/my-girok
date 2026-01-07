# Design System

V0.0.1 AAA Workstation - WCAG 2.1 AAA Compliance

## Visual Style

| Element      | Specification             |
| ------------ | ------------------------- |
| Card Radius  | 48px forms, 64px sections |
| Border Width | 2px for interactive       |
| Padding      | `p-10 md:p-14` cards      |
| Touch Target | 44px min, 56px prominent  |
| Focus Ring   | 4px width, 4px offset     |
| Nav Height   | 80px                      |

## Typography

| Element     | Styling                                              |
| ----------- | ---------------------------------------------------- |
| Hero Title  | `text-[10rem] italic tracking-tighter serif`         |
| Page Title  | `text-4xl sm:text-5xl italic tracking-tighter serif` |
| Card Title  | `text-2xl font-bold`                                 |
| Badge       | `text-[11px] font-black uppercase tracking-[0.3em]`  |
| Input Label | `text-xs font-bold uppercase tracking-widest`        |

Fonts: Title=Playfair Display (italic), Brand=System monospace

## Theme Architecture

```
Layer 0: @property definitions  -> Type safety
Layer 1: Palette (--palette-*)  -> Raw colors
Layer 2: Semantic (--theme-*)   -> Theme-switchable
Layer 3: Tailwind               -> bg-theme-*, text-theme-*
```

## Colors

### Light Mode (Clean White Oak)

| Token          | Value   | Contrast |
| -------------- | ------- | -------- |
| Primary Text   | #262220 | 15.76:1  |
| Secondary Text | #4A4744 | 9.23:1   |
| Primary Accent | #6B4A2E | 7.94:1   |

### Dark Mode (Midnight Gentle Study)

| Token          | Value   | Contrast |
| -------------- | ------- | -------- |
| Primary Text   | #CCC5BD | 9.94:1   |
| Secondary Text | #B4ADA5 | 7.65:1   |
| Primary Accent | #D0B080 | 8.25:1   |

All combinations meet WCAG 2.1 AAA (7:1+).

## Radius Tokens

| Token                 | Size | Usage          |
| --------------------- | ---- | -------------- |
| rounded-soft          | 8px  | Default all UI |
| rounded-input         | 24px | Large inputs   |
| rounded-editorial-lg  | 48px | Form cards     |
| rounded-editorial-2xl | 64px | Sections       |

## Button Sizes

| Size  | Height | Styling                       |
| ----- | ------ | ----------------------------- |
| sm/md | 44px   | Standard                      |
| lg    | 56px   | font-black uppercase          |
| xl    | 64px   | font-black uppercase tracking |

## HTML5 Semantics

```tsx
<>
  <main className="min-h-screen pt-nav">{/* Content */}</main>
  <Footer /> {/* Sibling, not child */}
</>
```

- One `<main>` per page, never nested
- `<Footer>` outside `<main>`
