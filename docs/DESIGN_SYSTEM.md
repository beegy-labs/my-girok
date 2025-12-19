# Design System & Brand Identity

> My-Girok Design Guidelines - **V0.0.1 AAA Workstation**

## Version

**Current Version**: V0.0.1 AAA Workstation (2025-12)

This design system implements WCAG 2.1 AAA compliance with a "Modern Editorial Archive" aesthetic optimized for professional record-keeping applications.

## Brand Concept

**"나에 대한 것을 책에 쓴다" (Writing about myself in a book)**

My-Girok is a personal record-keeping platform where users document their life stories, careers, thoughts, and finances. The design reflects the warmth and serenity of a personal library or study room.

### Brand Values

- **Knowledge**: Archive and organize personal information
- **Authenticity**: Express yourself genuinely
- **Focus**: Comfortable for long reading and writing sessions
- **Growth**: Track personal development over time

## Design Style: V0.0.1 AAA Workstation

> "Sophisticated Classic" aesthetic with serif titles, editorial layout, and AAA accessibility

### Key Visual Characteristics

| Element         | Specification                                |
| --------------- | -------------------------------------------- |
| Card Radius     | 48px (forms), 56px (promos), 64px (sections) |
| Border Width    | 2px (`border-2`) for interactive elements    |
| Primary Padding | `p-10 md:p-14` for main cards                |
| Touch Targets   | 44px minimum, 56px for prominent actions     |
| Title Font      | Playfair Display (italic)                    |
| Brand Font      | System monospace                             |
| Letter Spacing  | `tracking-[0.3em]` for uppercase labels      |

### Typography Hierarchy

| Element        | Styling                                                       |
| -------------- | ------------------------------------------------------------- |
| Hero Title     | `text-[10rem] italic tracking-tighter serif`                  |
| Page Title     | `text-4xl sm:text-5xl italic tracking-tighter serif`          |
| Section Title  | `text-4xl tracking-tight serif`                               |
| Card Title     | `text-2xl font-bold` or `text-4xl serif`                      |
| Subtitle/Badge | `text-[11px] font-black uppercase tracking-[0.3em] monospace` |
| Input Label    | `text-xs font-bold uppercase tracking-widest`                 |
| Description    | `text-[18px] font-bold`                                       |

## Scalable Theme Architecture

The theme system uses a 4-layer architecture for type safety and easy extensibility:

```
Layer 0: @property definitions    → Type safety, smooth animations (CSS Houdini)
Layer 1: Palette (--palette-*)    → Raw colors, defined once, never use directly
Layer 2: Semantic (--theme-*)     → Theme-switchable via [data-theme] attribute
Layer 3: Tailwind (@theme inline) → Maps to utilities (bg-theme-*, text-theme-*)
```

### CSS @property Type Safety

Key tokens use CSS `@property` for type validation and smooth transitions:

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #6b4a2e; /* AAA 7.94:1 */
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
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-default">
  <h2 className="text-theme-text-primary">Title</h2>
  <p className="text-theme-text-secondary">Description</p>
</div>
```

## Color Palette

### Theme: "Clean White Oak" (Light) + "Midnight Gentle Study" (Dark)

**Design Philosophy**: A professional archive aesthetic focused on WCAG 2.1 AAA accessibility compliance for socially inclusive design.

**Key Principles**:

- All text combinations meet WCAG 2.1 AAA 7:1+ contrast ratio
- Typography optimized for readability (line-height 1.8, min 16px, tracking-wide)
- Warm, earthy tones for a professional archive feel

### Light Mode - Clean White Oak

| Token          | Value   | Usage                            |
| -------------- | ------- | -------------------------------- |
| Page BG        | #FFFFFF | Page background                  |
| Card BG        | #F8F7F4 | Card backgrounds                 |
| Secondary BG   | #F5F4F1 | Section backgrounds              |
| Primary Text   | #262220 | Main text (15.76:1 contrast)     |
| Secondary Text | #4A4744 | Body text (9.23:1 contrast)      |
| Tertiary Text  | #5A5856 | Hint text (7.08:1 contrast)      |
| Primary Accent | #6B4A2E | Buttons, links (7.94:1 contrast) |

### Dark Mode - Midnight Gentle Study

| Token          | Value   | Usage                                     |
| -------------- | ------- | ----------------------------------------- |
| Page BG        | #1E1C1A | Page background                           |
| Card BG        | #282522 | Card backgrounds                          |
| Secondary BG   | #2D2A27 | Section backgrounds                       |
| Primary Text   | #CCC5BD | Main text (9.94:1 contrast)               |
| Secondary Text | #B4ADA5 | Body text (7.65:1 contrast)               |
| Tertiary Text  | #B0A9A1 | Hint text (7.31:1 contrast)               |
| Primary Accent | #D0B080 | Buttons, links (8.25:1 page, 7.41:1 card) |

### WCAG 2.1 AAA Compliance

All text color combinations meet WCAG 2.1 AAA standards (7:1+):

| Element          | Light Mode | Dark Mode | WCAG Level |
| ---------------- | ---------- | --------- | ---------- |
| Primary Text     | 15.76:1    | 9.94:1    | AAA        |
| Secondary Text   | 9.23:1     | 7.65:1    | AAA        |
| Tertiary Text    | 7.08:1     | 7.31:1    | AAA        |
| Primary Button   | 7.70:1+    | 9.46:1+   | AAA        |
| Secondary Button | 7.41:1     | 7.54:1    | AAA        |
| Danger Button    | 9.51:1     | 9.51:1    | AAA        |

### WCAG SC 1.4.11 Non-text Contrast (Borders)

UI components (borders, icons) require 3:1 minimum contrast per WCAG SC 1.4.11.

| Token                    | Light Mode | Dark Mode | Ratio | Usage                   |
| ------------------------ | ---------- | --------- | ----- | ----------------------- |
| `--theme-border-subtle`  | #D4D2CF    | #4A4744   | 1.5:1 | Decorative only         |
| `--theme-border-default` | #A09D9A    | #6B6663   | 3.0:1 | Interactive elements ✅ |
| `--theme-border-strong`  | #8A8785    | #8A8583   | 3.8:1 | Emphasis ✅             |

## Typography

### Editorial Typography Tokens

```css
:root {
  /* Editorial Typography */
  --font-family-serif-title: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-family-mono-brand: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;

  /* Editorial Layout - V0.0.1 */
  --radius-editorial: 40px;
  --radius-editorial-lg: 48px; /* Form cards */
  --radius-editorial-xl: 56px; /* Promo cards */
  --radius-editorial-2xl: 64px; /* Section containers */
  --radius-input: 24px; /* Input fields */
  --spacing-editorial: 40px;
  --nav-height-editorial: 80px;

  /* Editorial Animation */
  --ease-editorial: cubic-bezier(0.2, 1, 0.3, 1);
}
```

### WCAG-Optimized Settings

```css
:root {
  font-size: 16px; /* Minimum for WCAG 2.1 AA */
  line-height: 1.8; /* Improved readability */
  letter-spacing: -0.02em; /* Korean/CJK optimization */
}
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
| `text-5xl`  | 48px | Hero titles         |

## Border Radius Guide (V0.0.1)

| Token            | Size | Usage                            |
| ---------------- | ---- | -------------------------------- |
| `rounded-xl`     | 12px | Inputs (default size)            |
| `rounded-2xl`    | 16px | Secondary buttons, ViewToggle    |
| `rounded-3xl`    | 24px | MenuRow                          |
| `rounded-[24px]` | 24px | Input (lg size), primary buttons |
| `rounded-[40px]` | 40px | Archive support banner           |
| `rounded-[48px]` | 48px | Form cards (Login, Register)     |
| `rounded-[56px]` | 56px | Promo carousel                   |
| `rounded-[64px]` | 64px | MenuCard, Workstation section    |
| `rounded-full`   | 50%  | Circular buttons, hero button    |

## Component Specifications (V0.0.1)

### Form Cards (Login, Register, ForgotPassword)

```tsx
// Card container
<div className="bg-theme-bg-card border-2 border-theme-border-default rounded-[48px] p-10 md:p-14 shadow-theme-lg">

// Page title
<h1
  className="text-4xl sm:text-5xl text-theme-text-primary mb-3 tracking-tighter italic"
  style={{ fontFamily: 'var(--font-family-serif-title)' }}
>
  Login
</h1>

// Subtitle
<p
  className="text-[11px] font-black uppercase tracking-[0.3em] text-theme-text-secondary"
  style={{ fontFamily: 'var(--font-family-mono-brand)' }}
>
  Archive Access
</p>
```

### Form Inputs (size="lg")

```tsx
<TextInput
  label="Email"
  type="email"
  size="lg" // h-16, rounded-[24px], font-bold
  icon={<Mail size={18} />} // Left icon
  value={email}
  onChange={setEmail}
  required
/>
```

- Height: 64px (`h-16`)
- Border radius: 24px (`rounded-[24px]`)
- Font weight: Bold (`font-bold`)
- Icon padding: `pl-14`
- Border: 2px (`border-2`)

### Buttons

```tsx
// Primary submit button (xl size)
<Button
  variant="primary"
  size="xl"                    // min-h-[64px], font-black, uppercase
  rounded="editorial"          // rounded-[24px]
  icon={<ArrowRight size={18} />}
>
  Sign In
</Button>

// Secondary action button (lg size)
<Button
  variant="secondary"
  size="lg"                    // min-h-[56px], font-black, uppercase
  rounded="default"            // rounded-2xl (16px)
>
  <UserPlus size={16} />
  Create Account
</Button>

// Hero button (xl size, full rounded)
<Button
  variant="primary"
  size="xl"
  rounded="full"               // rounded-full
  className="px-20 py-8"
>
  Enter
</Button>
```

### Button Size Reference

| Size | Min Height | Styling                                             |
| ---- | ---------- | --------------------------------------------------- |
| sm   | 44px       | Standard body text                                  |
| md   | 44px       | Standard body text                                  |
| lg   | 56px       | `font-black uppercase tracking-widest text-[11px]`  |
| xl   | 64px       | `font-black uppercase tracking-[0.3em] text-[14px]` |

### MenuCard (Dashboard Grid)

```tsx
<MenuCard
  index={1} // Displays as "01"
  icon={<Book />} // Icon in p-6 rounded-[28px] container
  title="Journal" // text-4xl serif
  description="Record daily thoughts" // text-[18px] font-bold
  onClick={() => navigate('/journal')}
/>
```

- Card: `rounded-[64px] border-2 p-10 md:p-12 min-h-[380px]`
- Icon container: `p-6 rounded-[28px] border-2`
- Index badge: `text-[12px] font-black tracking-[0.3em] monospace`

### Workstation Section

```tsx
<section className="p-10 md:p-14 rounded-[64px] bg-theme-bg-secondary border-2 border-theme-border-default">
  {/* Header with border-b-2 */}
  <div className="border-b-2 border-theme-border-default pb-10 mb-12">
    <div className="p-5 bg-theme-bg-card rounded-[24px] border-2">
      <Layers size={28} />
    </div>
    <h2 className="text-2xl font-bold">Workstation</h2>
  </div>

  {/* Widget grid */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
    {/* Active widget: rounded-[48px] border-2 p-10 */}
    {/* Empty slot: border-dashed rounded-[48px] */}
  </div>
</section>
```

### Index Section Header

```tsx
<div className="flex items-center justify-between mb-14 border-b-4 border-theme-text-primary pb-10 px-6">
  <h2
    className="text-4xl text-theme-text-primary tracking-tight"
    style={{ fontFamily: 'var(--font-family-serif-title)' }}
  >
    Index
  </h2>
  <ViewToggle value={viewMode} onChange={setViewMode} />
</div>
```

### Navbar

V0.0.1 editorial navigation with 48px touch targets.

```tsx
<nav
  className="fixed top-0 left-0 right-0 z-50 bg-theme-bg-card/95 backdrop-blur-xl border-b border-theme-border-default"
  style={{ height: 'var(--nav-height-editorial, 80px)' }}
>
  <div className="max-w-5xl mx-auto px-4 sm:px-8 h-full flex justify-between items-center">
    {/* Logo - V0.0.1 monospace with accent dot */}
    <span
      className="text-2xl font-black text-theme-text-primary tracking-tighter select-none"
      style={{ fontFamily: 'var(--font-family-mono-brand)' }}
    >
      girok<span className="text-theme-primary">.</span>
    </span>

    <div className="flex items-center gap-2">
      {/* User profile (authenticated) */}
      <div className="flex items-center gap-3 px-4 py-2 hover:bg-theme-bg-secondary rounded-2xl">
        <div className="w-8 h-8 rounded-full bg-theme-bg-secondary border border-theme-border-default flex items-center justify-center">
          <User size={16} className="text-theme-primary" />
        </div>
        <span
          className="text-[13px] font-black text-theme-text-primary uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-family-mono-brand)' }}
        >
          Username
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-theme-border-default mx-2" />

      {/* Icon buttons - 48px touch target */}
      <button className="p-3 rounded-xl hover:bg-theme-bg-hover min-w-[48px] min-h-[48px]">
        <Moon size={22} />
      </button>

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Auth button */}
      <button className="p-3 rounded-xl hover:bg-theme-bg-hover min-w-[48px] min-h-[48px]">
        <User size={22} />
      </button>
    </div>
  </div>
</nav>
```

**Navbar Specifications:**

| Element      | Specification                                                      |
| ------------ | ------------------------------------------------------------------ |
| Height       | 80px (`--nav-height-editorial`)                                    |
| Logo         | `text-2xl font-black tracking-tighter` + `.` in primary color      |
| Icon buttons | `min-w-[48px] min-h-[48px] p-3 rounded-xl`                         |
| Icon size    | 22px (`size={22}`)                                                 |
| User profile | Avatar `w-8 h-8 rounded-full` + `text-[13px] font-black uppercase` |
| Separator    | `w-px h-6 bg-theme-border-default mx-2`                            |
| Dropdown     | `rounded-[24px] border-2 border-theme-border-default`              |

### LanguageSwitcher

Simple 2-character language toggle with dropdown.

```tsx
<div className="relative">
  {/* Trigger button - 48px touch target */}
  <button
    className="p-3 text-[12px] font-black uppercase text-theme-text-primary hover:bg-theme-bg-hover rounded-xl transition-colors w-12 min-h-[48px] flex items-center justify-center tracking-tighter"
    style={{ fontFamily: 'var(--font-family-mono-brand)' }}
  >
    KO
  </button>

  {/* Dropdown */}
  <div className="absolute right-0 mt-4 w-48 bg-theme-bg-card border-2 border-theme-border-default rounded-[24px] shadow-theme-lg py-2">
    <button className="w-full flex items-center gap-3 px-5 py-3.5 text-sm min-h-[44px]">
      <span>🇰🇷</span>
      <span>한국어</span>
      <Check className="w-4 h-4 ml-auto text-theme-primary" />
    </button>
    {/* ... more options */}
  </div>
</div>
```

**LanguageSwitcher Specifications:**

| Element      | Specification                                                |
| ------------ | ------------------------------------------------------------ |
| Button       | `p-3 text-[12px] font-black uppercase tracking-tighter w-12` |
| Touch target | `min-h-[48px]`                                               |
| Display      | Simple 2-char code (KO, EN, JA)                              |
| Dropdown     | `rounded-[24px] border-2`                                    |
| Options      | `px-5 py-3.5 min-h-[44px]` with flag + label + check icon    |

### Footer

```tsx
<footer className="mt-40 py-16 sm:py-24 border-t-2 border-theme-border-default bg-theme-bg-secondary/40">
  <p
    className="text-lg text-theme-text-primary font-black uppercase tracking-[0.5em] sm:tracking-[0.6em]"
    style={{ fontFamily: 'var(--font-family-mono-brand)' }}
  >
    girok.dev
    <span className="text-theme-primary ml-2">© 2025</span>
  </p>
  <p className="text-[12px] font-bold uppercase tracking-widest">System V0.0.1 AAA Enhanced</p>
</footer>
```

## Spacing Patterns (V0.0.1)

| Context           | Mobile   | Desktop  |
| ----------------- | -------- | -------- |
| Form card padding | `p-10`   | `p-14`   |
| Section padding   | `p-10`   | `p-14`   |
| Widget card       | `p-10`   | `p-12`   |
| Card gap          | `gap-6`  | `gap-8`  |
| Widget gap        | `gap-10` | `gap-10` |
| Section margin    | `mb-16`  | `mb-20`  |
| Footer margin     | `mt-40`  | `mt-40`  |

## Touch Targets (WCAG 2.5.5)

| Element         | Size     | Class                           |
| --------------- | -------- | ------------------------------- |
| Standard button | 44×44px  | `min-h-[44px]`                  |
| Carousel button | 56×56px  | `min-w-[56px] min-h-[56px] p-5` |
| Primary action  | 64×64px+ | `min-h-[64px]`                  |
| Icon button     | 48×48px  | `min-w-[48px] min-h-[48px] p-3` |

## Focus States

All interactive elements use consistent focus styling:

```css
focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4
```

## File Locations

```
packages/design-tokens/        # SINGLE SOURCE OF TRUTH for design tokens
├── src/tokens.css            # Theme variables (Layers 0-3 with @property)
└── README.md                 # Token documentation

packages/ui-components/src/    # Shared UI components (depends on design-tokens)
├── Button.tsx                # primary/secondary/danger/ghost, sm/md/lg/xl
├── Card.tsx                  # radius options: default/lg/xl/2xl
├── TextInput.tsx             # size options: default/lg, icon support
├── MenuCard.tsx              # Editorial 64px card
├── MenuRow.tsx               # Editorial list row
├── ViewToggle.tsx            # Grid/List toggle
├── TopWidget.tsx             # Pinned dashboard widget
├── Badge.tsx                 # Status badges, rounded options
└── ...

apps/web-main/src/
├── pages/
│   ├── HomePage.tsx          # Landing + Dashboard
│   ├── LoginPage.tsx         # V0.0.1 editorial form
│   ├── RegisterPage.tsx      # V0.0.1 editorial form
│   └── ForgotPasswordPage.tsx # V0.0.1 editorial form
└── components/
    └── Footer.tsx            # V0.0.1 editorial footer
```

## Version History

- **V0.0.1** (2025-12): AAA Workstation design system
  - Italic serif titles with tracking-tighter
  - Increased border radius (48px forms, 64px sections)
  - border-2 for interactive elements
  - lg size inputs (h-16, rounded-[24px])
  - xl size buttons (64px, font-black uppercase)
  - Widget slot backgrounds with dot pattern
  - Footer with 0.6em tracking brand text
- v2.3.0 (2025-12): WCAG 2.1 AAA upgrade (7:1+ contrast), rebrand to "Girok"
- v2.2.0 (2025-12): Add CSS @property type safety, @theme inline, pnpm catalogs
- v2.1.0 (2025-12): Extract design tokens to dedicated package (@my-girok/design-tokens)
- v2.0.0 (2025-12): Consolidated and optimized documentation, removed legacy patterns
