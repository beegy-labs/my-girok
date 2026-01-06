# Design System

> V0.0.1 AAA Workstation - WCAG 2.1 AAA Compliance

## Brand

**"나에 대한 것을 책에 쓴다"** - Personal record-keeping platform

## Visual Style

| Element      | Specification                 |
| ------------ | ----------------------------- |
| Card Radius  | 48px (forms), 64px (sections) |
| Border Width | 2px for interactive elements  |
| Padding      | `p-10 md:p-14` main cards     |
| Touch Target | 44px min, 56px prominent      |
| Focus Ring   | 4px width, 4px offset         |
| Nav Height   | 80px                          |

## Typography

| Element     | Styling                                                       |
| ----------- | ------------------------------------------------------------- |
| Hero Title  | `text-[10rem] italic tracking-tighter serif`                  |
| Page Title  | `text-4xl sm:text-5xl italic tracking-tighter serif`          |
| Card Title  | `text-2xl font-bold`                                          |
| Badge       | `text-[11px] font-black uppercase tracking-[0.3em] monospace` |
| Input Label | `text-xs font-bold uppercase tracking-widest`                 |

**Fonts:**

- Title: Playfair Display (italic)
- Brand: System monospace

## Theme Architecture

```
Layer 0: @property definitions  → Type safety
Layer 1: Palette (--palette-*)  → Raw colors
Layer 2: Semantic (--theme-*)   → Theme-switchable
Layer 3: Tailwind              → bg-theme-*, text-theme-*
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

## Border Contrast (SC 1.4.11)

| Token          | Ratio | Usage                |
| -------------- | ----- | -------------------- |
| border-subtle  | 1.5:1 | Decorative only      |
| border-default | 3.0:1 | Interactive elements |
| border-strong  | 3.8:1 | Emphasis             |

## Radius Tokens

| Token                 | Size | Usage                  |
| --------------------- | ---- | ---------------------- |
| rounded-soft          | 8px  | **Default for all UI** |
| rounded-input         | 24px | Large inputs           |
| rounded-editorial-lg  | 48px | Form cards             |
| rounded-editorial-2xl | 64px | Section containers     |

## Button Sizes

| Size  | Height | Styling                                             |
| ----- | ------ | --------------------------------------------------- |
| sm/md | 44px   | Standard                                            |
| lg    | 56px   | `font-black uppercase tracking-widest text-[11px]`  |
| xl    | 64px   | `font-black uppercase tracking-[0.3em] text-[14px]` |

## HTML5 Semantics

```tsx
// Correct page structure
<>
  <main className="min-h-screen pt-nav">{/* Content */}</main>
  <Footer />
</>

// Wrong: nested main or footer inside main
```

**Rules:**

- One `<main>` per page, never nested
- `<Footer>` outside of `<main>`
- Use semantic elements: `<nav>`, `<article>`, `<section>`, `<aside>`

## Component Examples

```tsx
// Form card
<div className="bg-theme-bg-card border border-theme-border-subtle rounded-soft p-10 md:p-14">

// Page title
<h1 className="text-4xl sm:text-5xl italic tracking-tighter"
    style={{ fontFamily: 'var(--font-family-serif-title)' }}>

// Input
<TextInput size="lg" icon={<Mail />} />

// Button
<Button variant="primary" size="xl" rounded="editorial">
```

## File Locations

```
packages/design-tokens/src/tokens.css  # SSOT for theme
packages/ui-components/src/            # Button, Card, TextInput
```

---

**Quick reference**: `.ai/ssot.md`, `.ai/packages/design-tokens.md`
