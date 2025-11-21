# Design System & Brand Identity

> My-Girok Design Guidelines and Brand Identity

## Brand Concept

### Core Concept
**"나에 대한 것을 책에 쓴다" (Writing about myself in a book)**

My-Girok is a personal record-keeping platform where users document their life stories, careers, thoughts, and finances. The design reflects the warmth and serenity of a personal library or study room.

### Brand Values
- **📚 Knowledge**: Archive and organize personal information
- **✍️ Authenticity**: Express yourself genuinely
- **🎯 Focus**: Comfortable for long reading and writing sessions
- **🌱 Growth**: Track personal development over time

## Color Palette

### Primary Colors (Library Theme)

#### Main Brand Color
```css
/* Warm Brown - Vintage book cover feel */
--primary-amber-900: #78350F;
--primary-amber-800: #92400E;
--primary-amber-700: #B45309;
--primary-amber-600: #D97706;
```

#### Secondary Colors
```css
/* Cool Gray - Serene study atmosphere */
--secondary-gray-700: #374151;
--secondary-gray-600: #4B5563;
--secondary-gray-500: #6B7280;
```

#### Accent Colors
```css
/* Warm Amber - Cozy lighting */
--accent-amber-500: #F59E0B;
--accent-amber-400: #FBBF24;
```

#### Background Colors
```css
/* Off-white - Book page feel */
--bg-amber-50: #FFFBEB;
--bg-gray-50: #F9FAFB;
--bg-white: #FFFFFF;
```

### Usage Guidelines

#### Primary Use Cases
- **Main Actions**: Login buttons, CTAs → `amber-700 to amber-600` gradient
- **Headers**: Page titles, section headers → `amber-900`
- **Links**: Interactive text elements → `amber-700`

#### Secondary Use Cases
- **Body Text**: Main content → `gray-700`
- **Secondary Text**: Descriptions, hints → `gray-600`
- **Borders**: Card outlines, dividers → `amber-100`, `gray-200`

#### Background Use Cases
- **Cards**: Content containers → `amber-50/30` (30% opacity)
- **Page Background**: Default background → `gray-50`
- **Form Inputs**: Input fields → `white` with `amber-200` borders

### Color Accessibility
All color combinations meet WCAG 2.1 AA standards:
- `amber-900` on `white`: 8.52:1 (AAA)
- `gray-700` on `white`: 7.21:1 (AAA)
- `amber-700` on `white`: 5.12:1 (AA)

### Special Case: Resume Preview & Print (Print-Optimized)

**Important**: Only the resume preview component and PDF output use high-contrast grayscale design for optimal printing and readability. The resume editing UI follows standard brand colors.

#### Design Philosophy

**Goal**: Create a professional, print-ready resume with maximum readability
- **Not pure black & white**: Use grayscale range (gray-50 ~ gray-900)
- **High contrast**: Ensure excellent readability for both screen and print
- **Print-optimized**: Reduce printing costs, ATS-friendly
- **Separate concerns**: Editing interface maintains brand identity

#### Print-Optimized Grayscale Palette
```css
/* Grayscale only for ResumePreview component and PDF export */
--resume-primary: #111827;    /* gray-900 - Headers, strong emphasis */
--resume-secondary: #374151;  /* gray-700 - Body text, readable */
--resume-tertiary: #4B5563;   /* gray-600 - Secondary text */
--resume-border: #9CA3AF;     /* gray-400 - Section dividers */
--resume-light: #F3F4F6;      /* gray-100 - Light backgrounds */
--resume-bg: #F9FAFB;         /* gray-50 - Page background */
```

#### Grayscale vs Brand Colors

**Use Grayscale (ONLY for preview/print):**
- `ResumePreview` component - The actual resume content display
- PDF export output
- Print view (when printing from browser)
- Public resume page (`:username/resume`) - The displayed resume

**Use Brand Colors (amber) - Standard UI:**
- Resume Edit Page UI (`/resume/:username/edit`) - Form, headers, buttons
- Resume Preview Page UI (`/resume/:username/preview`) - Action bar, controls, buttons
- All navigation and controls surrounding the resume

#### Resume Preview Component Rules
Applied ONLY to the `ResumePreview` component:

1. **High-Contrast Grayscale**: Use gray-50 through gray-900 (NOT pure black/white)
2. **No Brand Colors**: Do NOT use amber/brown colors in resume content
3. **Print First**: Design for black & white printing
4. **Readability Focus**: Ensure 7:1 contrast minimum for text
5. **Grayscale Images**: Apply `filter: grayscale(100%)` to profile photos
6. **Clean Layout**: Minimal decoration, focus on content hierarchy

#### Resume Preview Component Examples

**Resume Section Header (in ResumePreview component)**
```jsx
className="text-xl font-bold text-gray-900 mb-3
           border-b border-gray-400 pb-1"
```

**Resume Container (in ResumePreview component)**
```jsx
className="bg-gray-50 border border-gray-200
           rounded-2xl shadow-md p-6"
```

**Resume Text Link (in ResumePreview component)**
```jsx
className="text-gray-700 hover:underline"
```

**Page Action Buttons (OUTSIDE ResumePreview - use amber)**
```jsx
className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600
           hover:from-amber-800 hover:to-amber-700 text-white
           font-semibold rounded-lg shadow-lg shadow-amber-700/30"
```

#### Why Grayscale for Resume Content Only?
- **Print Optimization**: Most resumes are printed in black & white
- **Cost Effective**: Reduces color printing costs for end users
- **Professional Appearance**: Clean, distraction-free resume layout
- **Better Readability**: High contrast text on neutral background
- **ATS Friendly**: Applicant Tracking Systems prefer simple formatting
- **UI Consistency**: Editing interface maintains brand identity

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans", sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
```

### Font Sizes
```css
--text-5xl: 3rem;     /* 48px - Hero headings */
--text-4xl: 2.25rem;  /* 36px - Page titles */
--text-3xl: 1.875rem; /* 30px - Section headers */
--text-2xl: 1.5rem;   /* 24px - Card headers */
--text-xl: 1.25rem;   /* 20px - Subheadings */
--text-lg: 1.125rem;  /* 18px - Large body text */
--text-base: 1rem;    /* 16px - Body text */
--text-sm: 0.875rem;  /* 14px - Small text */
--text-xs: 0.75rem;   /* 12px - Captions */
```

### Font Weights
```css
--font-bold: 700;     /* Headers, emphasis */
--font-semibold: 600; /* Subheaders, labels */
--font-medium: 500;   /* Buttons, links */
--font-normal: 400;   /* Body text */
```

## Iconography

### Icon Style
- **Emoji-based**: Use native emojis for a warm, approachable feel
- **Consistent Theme**: Book and stationery related icons

### Core Icons
```
📚 - Brand logo, library, collections
📖 - Records, reading, sections
📄 - Resume, documents
✍️ - Blog, writing, editing
💰 - Budget, finance, money
🔗 - Links, connections
⚙️ - Settings, configuration
```

## Spacing System

### Base Unit: 4px (0.25rem)

```css
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-5: 1.25rem;   /* 20px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-12: 3rem;     /* 48px */
```

### Layout Spacing
- **Component Padding**: `spacing-6` (24px) for cards, `spacing-8` (32px) for sections
- **Gap Between Elements**: `spacing-4` (16px) default, `spacing-6` (24px) for cards
- **Page Margins**: `spacing-4` (16px) mobile, `spacing-8` (32px) desktop

## Components

### Navigation Bar (Navbar)

#### Structure
```jsx
<nav className="bg-white border-b border-amber-100">
  <div className="container mx-auto px-4 sm:px-6">
    <div className="flex justify-between items-center h-14 sm:h-16">
      {/* Logo */}
      <Link className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
        <span className="text-xl sm:text-2xl">📚</span>
        <span className="text-lg sm:text-2xl font-bold text-amber-900">
          My-Girok
        </span>
      </Link>

      {/* Right menu items */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* User dropdown, language switcher, etc. */}
      </div>
    </div>
  </div>
</nav>
```

#### User Dropdown Menu
```jsx
<div className="relative">
  <button className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2
                     rounded-lg hover:bg-amber-50 transition-colors">
    <p className="text-xs sm:text-sm font-semibold text-gray-700">
      {user?.name}
    </p>
    {/* Only show role for ADMIN */}
    {user?.role === 'ADMIN' && (
      <p className="text-xs text-amber-600 font-medium">ADMIN</p>
    )}
  </button>

  {/* Dropdown menu */}
  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg
                  shadow-lg border border-amber-100 py-1 z-50">
    <Link className="block px-4 py-2 text-sm text-gray-700
                     hover:bg-amber-50 transition-colors">
      Menu Item
    </Link>
  </div>
</div>
```

**Mobile Responsiveness**:
- Use `sm:` breakpoint for desktop sizes
- Reduce font sizes and spacing for mobile (`text-xs` → `text-sm`, `space-x-1` → `space-x-2`)
- Reduce navbar height for mobile (`h-14` → `h-16`)
- Use `flex-shrink-0` on logo to prevent squashing

### Buttons

#### Primary Button
```jsx
className="bg-gradient-to-r from-amber-700 to-amber-600
           hover:from-amber-800 hover:to-amber-700
           text-white font-semibold py-3 px-4 rounded-lg
           transition-all transform hover:scale-[1.02]
           active:scale-[0.98] shadow-lg shadow-amber-700/30"
```

#### Secondary Button
```jsx
className="bg-gray-100 hover:bg-gray-200 text-gray-700
           px-8 py-3 rounded-lg font-semibold
           border border-gray-300 transform hover:scale-105
           transition-all"
```

### Cards

#### Standard Card
```jsx
className="bg-amber-50/30 border border-amber-100
           rounded-2xl shadow-md p-6
           hover:shadow-xl hover:-translate-y-1
           hover:border-amber-300 transition-all"
```

#### Content Card
```jsx
className="bg-amber-50/30 border border-amber-100
           rounded-2xl shadow-lg p-8"
```

### Form Inputs

#### Text Input
```jsx
className="w-full px-4 py-3 bg-white text-gray-900
           border border-amber-200 rounded-lg
           focus:outline-none focus:ring-2
           focus:ring-amber-400 focus:border-transparent
           transition-all
           placeholder:text-gray-400"
```

**Important**: All input fields MUST include `text-gray-900` for proper text visibility and readability.

#### Label
```jsx
className="block text-sm font-semibold text-gray-700 mb-2"
```

### Links

#### Primary Link
```jsx
className="font-semibold text-amber-700
           hover:text-amber-800 transition-colors"
```

#### Navigation Link
```jsx
className="text-amber-700 hover:text-amber-800
           hover:underline font-medium
           flex items-center gap-1"
```

## Layout

### Container Widths
```css
--container-sm: 640px;   /* Mobile/Tablet */
--container-md: 768px;   /* Tablet */
--container-lg: 1024px;  /* Desktop */
--container-xl: 1280px;  /* Large Desktop */
--container-2xl: 1536px; /* Extra Large */
```

### Grid System
```jsx
/* 3-Column Layout (Desktop) */
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

/* 2-Column Layout */
className="grid grid-cols-1 md:grid-cols-2 gap-6"

/* Full Width */
className="max-w-7xl mx-auto"
```

### Responsive Breakpoints
```css
/* Mobile First Approach */
sm: 640px;   /* @media (min-width: 640px) - Tablet */
md: 768px;   /* @media (min-width: 768px) - Tablet Landscape */
lg: 1024px;  /* @media (min-width: 1024px) - Desktop */
xl: 1280px;  /* @media (min-width: 1280px) - Large Desktop */
2xl: 1536px; /* @media (min-width: 1536px) - Extra Large */
```

### Mobile-First Responsive Design Patterns

**Philosophy**: Design for mobile first, then enhance for larger screens using `sm:`, `md:`, `lg:` prefixes.

#### Pattern 1: Responsive Text Sizing
Scale text sizes appropriately for different screen sizes:
```jsx
/* Headers - Scale from mobile to desktop */
className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900"

/* Body text - Subtle scaling */
className="text-sm sm:text-base text-gray-700"

/* Button text - Ensure readability */
className="text-xs sm:text-sm font-semibold"
```

#### Pattern 2: Responsive Spacing
Reduce spacing on mobile to maximize screen real estate:
```jsx
/* Padding - Smaller on mobile */
className="p-4 sm:p-6 lg:p-8"

/* Gaps - Proportional spacing */
className="gap-2 sm:gap-3 lg:gap-4"

/* Margins - Vertical rhythm */
className="mb-2 sm:mb-3 lg:mb-4"
```

#### Pattern 3: Flexible Layouts
Transform layouts from stacked (mobile) to horizontal (desktop):
```jsx
/* Stack vertically on mobile, horizontal on tablet+ */
className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"

/* Header with button - Stack on mobile */
className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
```

#### Pattern 4: Responsive Grids
Adjust grid columns based on screen size:
```jsx
/* 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop) */
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"

/* Action buttons - 2 columns on mobile, flex on tablet */
className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2"
```

#### Pattern 5: Conditional Visibility
Show/hide elements based on screen size:
```jsx
/* Show on large screens only */
className="hidden lg:block"

/* Show on mobile only */
className="lg:hidden"

/* Toggle button for mobile preview */
className="lg:hidden px-4 py-2 bg-amber-700 text-white rounded-lg"
```

#### Pattern 6: Touch-Friendly Buttons
Ensure minimum touch target size (44x44px) on mobile:
```jsx
/* Responsive button padding */
className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg
           whitespace-nowrap"

/* Full-width on mobile, auto on desktop */
className="w-full sm:w-auto px-4 py-2"
```

#### Pattern 7: Responsive Modal/Dialog
Ensure modals work well on small screens:
```jsx
/* Fixed position with mobile padding */
className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"

/* Modal content - responsive sizing */
className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full"
```

#### Pattern 8: Wrapping and Overflow
Prevent horizontal scroll and text overflow:
```jsx
/* Allow text wrapping on mobile */
className="break-words"

/* Flex wrap for buttons */
className="flex flex-wrap gap-2 sm:gap-3"

/* Prevent button text wrapping */
className="whitespace-nowrap"

/* Truncate long text */
className="truncate"
```

#### Common Responsive Components

**Page Header (Mobile-First)**
```jsx
<div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div className="flex items-center gap-2 sm:gap-3 mb-2">
        <span className="text-2xl sm:text-3xl">📚</span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900">
          Page Title
        </h1>
      </div>
      <p className="text-sm sm:text-base text-gray-700 ml-8 sm:ml-12">
        Subtitle text
      </p>
    </div>
    <button className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-700 to-amber-600
                       text-white text-sm sm:text-base font-semibold rounded-lg
                       whitespace-nowrap">
      Action Button
    </button>
  </div>
</div>
```

**Card with Action Buttons**
```jsx
<div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-4 sm:p-6">
  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
    <div className="flex-1">
      <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">
        Card Title
      </h3>
      <p className="text-sm text-gray-600">Card description</p>
    </div>
    {/* Buttons: 2-col grid on mobile, flex on tablet */}
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2">
      <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold
                         rounded-lg whitespace-nowrap">
        Action 1
      </button>
      <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold
                         rounded-lg whitespace-nowrap">
        Action 2
      </button>
    </div>
  </div>
</div>
```

**Hero Section (Landing Page)**
```jsx
<div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-xl
                p-6 sm:p-8 lg:p-12 text-center">
  <span className="text-5xl sm:text-6xl">📚</span>
  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-amber-900 mb-3 sm:mb-4">
    My-Girok
  </h1>
  <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8">
    Description text
  </p>
  {/* Stack buttons vertically on mobile */}
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
    <button className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg">
      Primary Action
    </button>
    <button className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg">
      Secondary Action
    </button>
  </div>
</div>
```

#### Mobile-First Development Checklist

When implementing responsive designs:

- [ ] Design for mobile first (320px - 375px width)
- [ ] Use `sm:` prefix for tablet breakpoint (≥640px)
- [ ] Use `lg:` prefix for desktop breakpoint (≥1024px)
- [ ] Test on actual mobile devices or DevTools
- [ ] Ensure all text is readable (minimum 14px/0.875rem)
- [ ] Ensure touch targets are at least 44x44px
- [ ] Use `flex-col` on mobile, `sm:flex-row` on larger screens
- [ ] Reduce padding/spacing on mobile (`p-4 sm:p-6 lg:p-8`)
- [ ] Make buttons full-width on mobile when appropriate
- [ ] Use 2-column grid on mobile for action buttons
- [ ] Prevent horizontal scrolling with `break-words`, `flex-wrap`
- [ ] Use `whitespace-nowrap` for button text
- [ ] Hide non-essential elements on mobile with `lg:hidden`
- [ ] Test modals/dialogs with mobile padding (`p-4`)
- [ ] Ensure navbar is usable on small screens

## Animation & Transitions

### Standard Transitions
```css
transition-all duration-200 ease-in-out;
```

### Hover Effects
```css
/* Cards */
hover:shadow-xl hover:-translate-y-1

/* Buttons */
hover:scale-[1.02] active:scale-[0.98]

/* Links */
hover:underline
```

### Loading States
```jsx
/* Spinner */
<svg className="animate-spin h-5 w-5" />
```

## Shadows

### Elevation Levels
```css
/* Card Shadow */
shadow-md    /* 0 4px 6px rgba(0,0,0,0.1) */
shadow-lg    /* 0 10px 15px rgba(0,0,0,0.1) */
shadow-xl    /* 0 20px 25px rgba(0,0,0,0.1) */

/* Colored Shadow (for buttons) */
shadow-lg shadow-amber-700/30
```

## Border Radius

### Rounding Scale
```css
--rounded-lg: 0.5rem;    /* 8px - Inputs, buttons */
--rounded-xl: 0.75rem;   /* 12px - Small cards */
--rounded-2xl: 1rem;     /* 16px - Large cards */
--rounded-3xl: 1.5rem;   /* 24px - Modals */
--rounded-full: 9999px;  /* Badges, pills */
```

## Dark Mode - "Moonlit Library" Theme

### Concept
**"Reading in your personal library under the moonlight"**

The dark mode extends the library/study room concept into a serene nighttime environment. Imagine sitting in your personal library at night, with soft moonlight streaming through the window, illuminating the pages of your book. The design uses deep, calming backgrounds with warm amber accents that glow like candlelight.

### Brand Values (Dark Mode)
- **🌙 Serenity**: Calm, peaceful nighttime reading atmosphere
- **📚 Focus**: Reduced eye strain for long reading/writing sessions
- **✨ Warmth**: Soft amber glow maintains the cozy library feel
- **🌃 Depth**: Rich shadows create visual hierarchy

### Dark Mode Color Palette

#### Background Colors (Moonlit Night)
```css
/* Deep backgrounds - Night sky and shadowed library */
--dark-bg-primary: #0F1419;      /* Near-black with blue tint - Night sky */
--dark-bg-secondary: #1A1D23;    /* Slightly lighter - Shadowed study */
--dark-bg-card: #242830;         /* Card/bookshelf background */
--dark-bg-elevated: #2D3139;     /* Elevated surfaces, dropdowns */
--dark-bg-hover: #353A42;        /* Hover states */
```

#### Text Colors (Moonlit Text)
```css
/* Warm off-white - Text illuminated by moonlight */
--dark-text-primary: #E8E6E3;    /* Main text - Warm off-white */
--dark-text-secondary: #B8B5B2;  /* Secondary text - Medium gray */
--dark-text-tertiary: #8B8885;   /* Hints, descriptions - Subtle gray */
--dark-text-disabled: #5A5856;   /* Disabled text */
```

#### Accent Colors (Moonlight Reflection)
```css
/* Amber glow - Moonlight reflecting on warm surfaces */
--dark-accent-amber-200: #FDE68A; /* Bright glow - Hover states */
--dark-accent-amber-300: #FCD34D; /* Primary amber - Main actions */
--dark-accent-amber-400: #FBBF24; /* Medium amber - Links */
--dark-accent-amber-500: #F59E0B; /* Deep amber - Emphasis */
```

#### Border & Divider Colors (Shadow Boundaries)
```css
/* Subtle separators - Shadow and light boundaries */
--dark-border-subtle: #3A3D45;    /* Subtle borders */
--dark-border-default: #52575F;   /* Default borders */
--dark-border-strong: #6B7078;    /* Prominent borders */
--dark-border-accent: #78350F;    /* Amber borders */
```

### Color Usage Guidelines (Dark Mode)

#### Backgrounds
- **Page Background**: `dark-bg-primary` (#0F1419)
- **Cards**: `dark-bg-card` (#242830) with `dark-border-subtle` border
- **Forms/Inputs**: `dark-bg-secondary` (#1A1D23) with `dark-border-default` border
- **Elevated Elements**: `dark-bg-elevated` (#2D3139)

#### Text
- **Headings**: `dark-text-primary` (#E8E6E3)
- **Body Text**: `dark-text-secondary` (#B8B5B2)
- **Labels/Hints**: `dark-text-tertiary` (#8B8885)

#### Interactive Elements
- **Primary Buttons**: Gradient from `dark-accent-amber-400` to `dark-accent-amber-500`
- **Links**: `dark-accent-amber-400` (#FBBF24)
- **Hover**: Background `dark-bg-hover` + text `dark-accent-amber-200`

### Dark Mode Components

#### Primary Button (Dark Mode)
```jsx
className="bg-gradient-to-r from-amber-400 to-amber-500
           hover:from-amber-300 hover:to-amber-400
           text-gray-900 font-semibold py-3 px-4 rounded-lg
           transition-all transform hover:scale-[1.02]
           active:scale-[0.98] shadow-lg shadow-amber-500/20"
```

#### Card (Dark Mode)
```jsx
className="bg-[#242830] border border-[#3A3D45]
           rounded-2xl shadow-md p-6
           hover:shadow-xl hover:-translate-y-1
           hover:border-amber-500/30 transition-all"
```

#### Text Input (Dark Mode)
```jsx
className="w-full px-4 py-3 bg-[#1A1D23] text-[#E8E6E3]
           border border-[#52575F] rounded-lg
           focus:outline-none focus:ring-2
           focus:ring-amber-400 focus:border-transparent
           transition-all
           placeholder:text-[#8B8885]"
```

#### Navigation Link (Dark Mode)
```jsx
className="text-amber-400 hover:text-amber-300
           hover:underline font-medium
           flex items-center gap-1"
```

### Accessibility (Dark Mode)

All dark mode color combinations meet WCAG 2.1 AA standards:
- `#E8E6E3` (primary text) on `#0F1419` (background): 12.8:1 (AAA)
- `#B8B5B2` (secondary text) on `#0F1419`: 8.2:1 (AAA)
- `#FCD34D` (amber-300) on `#242830`: 8.9:1 (AAA)

**Target**: Maintain minimum 7:1 contrast ratio for all text

### Dark Mode Shadows

```css
/* Softer shadows for dark backgrounds */
--shadow-dark-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-dark-md: 0 4px 8px rgba(0, 0, 0, 0.4);
--shadow-dark-lg: 0 10px 20px rgba(0, 0, 0, 0.5);

/* Amber glow effect for interactive elements */
--shadow-amber-glow: 0 4px 12px rgba(251, 191, 36, 0.2);
```

### Implementation Strategy

#### Tailwind Dark Mode
Use Tailwind's `dark:` variant for all components:

```jsx
<div className="bg-amber-50 dark:bg-[#242830]
                border-amber-100 dark:border-[#3A3D45]">
  <h1 className="text-amber-900 dark:text-[#E8E6E3]">Title</h1>
  <p className="text-gray-700 dark:text-[#B8B5B2]">Description</p>
</div>
```

#### Theme Toggle
Store user preference in:
- LocalStorage (web)
- UserDefaults (iOS)
- SharedPreferences (Android)

Respect system preference with `prefers-color-scheme` media query.

### Special Considerations

#### Resume Preview
**Important**: Resume preview maintains grayscale design in both light and dark modes for print optimization.

**Light Mode**: gray-50 ~ gray-900 (as documented)
**Dark Mode**: Same grayscale palette (print-optimized)

The resume editing UI follows dark mode theme, but the preview component itself remains print-ready grayscale.

#### Images & Media
- Profile photos: No filter in dark mode (unlike resume preview)
- Decorative images: Reduce opacity to 90% for softer appearance
- Icons: Use warm off-white (#E8E6E3) instead of pure white

### Testing Checklist

- [ ] All text meets 7:1 contrast ratio minimum
- [ ] Interactive elements clearly distinguishable
- [ ] Forms readable and usable
- [ ] Cards and borders visible but not harsh
- [ ] Amber accents provide warmth without overwhelming
- [ ] Smooth transition between light/dark modes
- [ ] System preference detected correctly
- [ ] Theme preference persists across sessions

### Design Principles (Dark Mode)

#### Do's ✅
- Use deep, rich backgrounds for depth
- Maintain warm amber glow for brand consistency
- Reduce pure white; use warm off-white (#E8E6E3)
- Add subtle shadows for layering
- Test in low-light environments

#### Don'ts ❌
- Don't use pure black (#000000) - too harsh
- Don't use pure white (#FFFFFF) - too bright
- Don't make borders too prominent
- Don't lose the "library" warmth
- Don't reduce contrast below 7:1

### Future Enhancements

- Auto-switch based on time of day
- Adjustable warmth/contrast settings
- Reading mode (even darker, higher contrast)
- Custom theme creator

## Voice & Tone

### Brand Voice
- **Warm & Personal**: Like a trusted journal
- **Supportive**: Encouraging user's documentation journey
- **Professional yet Friendly**: Approachable but respectful

### Writing Style
- Use Korean for user-facing text
- Use informal but respectful tone (존댓말)
- Keep microcopy concise and helpful
- Example: "나만의 기록장을 만드세요" instead of "Register"

## Characters & Mascots

### Brand Characters

My-Girok features **theme-aware animated characters** that enhance user experience and reinforce the library/study room concept. Characters automatically switch based on the current theme.

#### 🐿️ Squirrel (Light Mode)

**Character Concept**: "Busy record collector during the day"

**Personality**:
- Energetic and enthusiastic
- Diligent and hard-working
- Cheerful and optimistic
- Always collecting and organizing (like gathering acorns)

**Visual Design**:
```css
/* Primary color - warm brown */
--squirrel-body: #D97706;      /* amber-600 */
--squirrel-belly: #FEF3C7;     /* amber-50 */
--squirrel-accent: #B45309;    /* amber-700 */
--squirrel-dark: #92400E;      /* amber-800 */
```

**Key Features**:
- Large fluffy tail
- Round body with lighter belly
- Pointed ears with inner detail
- Holding an acorn (when idle/loading)
- Whiskers for expressiveness

**Animations**:
- **Idle**: Subtle breathing, slight tail movement
- **Loading**: Vigorous tail wagging, acorn bouncing
- **Sad**: Droopy ears, downward mouth
- **Confused**: Tilted head, question mark floating
- **Sleeping**: Closed eyes, floating Z's

#### 🦉 Owl (Dark Mode)

**Character Concept**: "Silent library guardian at night"

**Personality**:
- Wise and knowledgeable
- Calm and mysterious
- Patient and observant
- Reading books under moonlight

**Visual Design**:
```css
/* Primary colors - cool gray tones */
--owl-body: #52575F;           /* dark-border-default */
--owl-belly: #6B7078;          /* dark-border-strong */
--owl-dark: #3A3D45;           /* dark-border-subtle */
--owl-eyes: #FBBF24;           /* amber-400 - glowing */
--owl-beak: #FCD34D;           /* amber-300 */
```

**Key Features**:
- Large round head with facial discs
- Prominent ear tufts
- Glowing amber eyes (signature feature)
- Holding/reading a book
- Crescent moon in background (idle state)

**Animations**:
- **Idle**: Slow blinking, subtle eye glow, moon pulsing
- **Loading**: Wing flapping, eyes glowing brighter, pulsing aura
- **Sad**: Sad eyebrows, dimmed eyes
- **Confused**: One eyebrow raised, tilted head
- **Sleeping**: Closed eyes, floating Z's

### Character States

All characters support **5 emotional states** to cover different UI scenarios:

| State | Use Case | Visual Indicators |
|-------|----------|-------------------|
| `idle` | Default, calm | Subtle animations, relaxed pose |
| `loading` | Data fetching, processing | Active movement (tail wag/wing flap) |
| `sad` | Errors, deleted content | Droopy features, sad mouth |
| `confused` | 404, not found, unclear | Tilted head, question mark |
| `sleeping` | Expired, maintenance, inactive | Closed eyes, Z's floating up |

### Usage Guidelines

#### When to Use Characters

**Do use characters for:**
- ✅ Loading states (data fetching)
- ✅ Empty states (no content)
- ✅ Error messages (system errors)
- ✅ 404 pages (not found)
- ✅ Expired/deleted content messages
- ✅ Permission denied messages
- ✅ Maintenance mode
- ✅ Success confirmations (celebratory)

**Don't use characters for:**
- ❌ Navigation elements
- ❌ Form labels
- ❌ Inline validation messages
- ❌ Tooltips
- ❌ Small UI components
- ❌ Every single page (overuse reduces impact)

#### Character Size Guidelines

```jsx
/* Small - Inline messages */
<CharacterLoader size={80} />

/* Medium - Default size */
<CharacterLoader size={120} />

/* Large - Full page states */
<CharacterLoader size={150} />

/* Extra Large - Hero sections */
<CharacterLoader size={200} />
```

**Minimum Size**: 60px (below this, details become unclear)
**Maximum Size**: 240px (above this, animation performance may degrade)

#### Message Pairing

Each character state should be paired with contextual messages:

**Light Mode (Squirrel) - Energetic Tone**:
```jsx
loading: "기록을 부지런히 찾고 있어요!"
not-found: "기록을 찾을 수 없어요"
error: "앗, 문제가 생겼어요"
expired: "공유 기간이 만료되었어요"
```

**Dark Mode (Owl) - Calm Tone**:
```jsx
loading: "고요한 밤에 기록을 찾는 중이에요..."
not-found: "이 기록은 밤의 도서관에 없어요"
error: "달빛이 흐려졌어요"
expired: "밤이 깊어 잠들었어요"
```

### Character Components

#### CharacterLoader

Theme-aware character that automatically switches between Squirrel and Owl.

```jsx
import { CharacterLoader } from './components/characters';

// Basic usage
<CharacterLoader state="loading" />

// Custom size
<CharacterLoader state="idle" size={150} />

// With all states
<CharacterLoader state="idle" />
<CharacterLoader state="loading" />
<CharacterLoader state="sad" />
<CharacterLoader state="confused" />
<CharacterLoader state="sleeping" />
```

#### CharacterMessage

Complete message component with character, title, message, and action button.

```jsx
import { CharacterMessage } from './components/characters';

// Predefined message types
<CharacterMessage type="loading" />
<CharacterMessage type="not-found" />
<CharacterMessage type="error" />
<CharacterMessage type="expired" />
<CharacterMessage type="deleted" />
<CharacterMessage type="no-permission" />
<CharacterMessage type="maintenance" />

// With custom action
<CharacterMessage
  type="not-found"
  action={
    <Link to="/">
      <Button>홈으로 돌아가기</Button>
    </Link>
  }
/>

// Override default messages
<CharacterMessage
  type="error"
  title="커스텀 제목"
  message="커스텀 메시지"
/>
```

#### LoadingSpinner

Reusable loading component with theme-aware character.

```jsx
import LoadingSpinner from './components/LoadingSpinner';

// Inline loading
<LoadingSpinner />

// Full screen overlay
<LoadingSpinner fullScreen />

// Custom message
<LoadingSpinner message="이력서를 불러오는 중..." />
```

### Message Type Reference

| Type | State | Squirrel Message | Owl Message |
|------|-------|------------------|-------------|
| `loading` | loading | "기록을 부지런히 찾고 있어요!" | "고요한 밤에 기록을 찾는 중이에요..." |
| `not-found` | confused | "기록을 찾을 수 없어요" | "이 기록은 밤의 도서관에 없어요" |
| `error` | sad | "앗, 문제가 생겼어요" | "달빛이 흐려졌어요" |
| `expired` | sleeping | "공유 기간이 만료되었어요" | "밤이 깊어 잠들었어요" |
| `deleted` | sad | "삭제된 기록이에요" | "어둠 속으로 사라진 기록이에요" |
| `no-permission` | confused | "접근 권한이 없어요" | "이 서재는 잠겨있어요" |
| `maintenance` | sleeping | "잠시 휴식 중이에요" | "도서관이 밤의 정비 중이에요" |

### Animation Performance

All character animations are optimized for performance:

**CSS Animations** (preferred):
```css
/* Smooth, GPU-accelerated */
animation: tail-wag 1s ease-in-out infinite;
transform-origin: 30px 40px;
```

**Animation Timing**:
- Idle animations: 2-4 seconds per cycle
- Loading animations: 0.5-2 seconds per cycle
- Blinking: 3-4 seconds interval
- Floating elements: 2-3 seconds

**Performance Guidelines**:
- Use `transform` over `left/top` for movement
- Limit simultaneous animations to 3-4 elements
- Use `will-change` sparingly for critical animations
- Pause animations when component is off-screen

### Accessibility

**Screen Reader Support**:
```jsx
<div role="status" aria-live="polite">
  <CharacterLoader state="loading" />
  <p>기록을 찾고 있어요...</p>
</div>
```

**Reduced Motion**:
```css
@media (prefers-reduced-motion: reduce) {
  .character-animation {
    animation: none;
  }
}
```

**Focus Management**:
- Character itself is decorative (aria-hidden="true")
- Ensure accompanying text is screen-reader accessible
- Action buttons must be keyboard accessible

### Character File Locations

```
apps/web-main/src/
├── components/
│   ├── characters/
│   │   ├── Squirrel.tsx          # Light mode character
│   │   ├── Owl.tsx                # Dark mode character
│   │   ├── CharacterLoader.tsx   # Theme-aware switcher
│   │   ├── CharacterMessage.tsx  # Complete message UI
│   │   ├── index.ts               # Exports
│   │   └── README.md              # Full documentation
│   ├── LoadingSpinner.tsx         # Loading component
│   └── ErrorBoundary.tsx          # Error boundary
└── pages/
    └── NotFoundPage.tsx            # 404 page
```

### Implementation Examples

#### Example 1: Shared Resume Link States

```jsx
export default function SharedResumePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorType, setErrorType] = useState<string | null>(null);

  if (status === 'loading') {
    return <LoadingSpinner fullScreen />;
  }

  if (status === 'error') {
    // Map backend errors to character message types
    const messageType = {
      'EXPIRED': 'expired',
      'DELETED': 'deleted',
      'NO_PERMISSION': 'no-permission',
      'NOT_FOUND': 'not-found',
    }[errorType] || 'error';

    return (
      <CharacterMessage
        type={messageType}
        action={
          <Link to="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        }
      />
    );
  }

  return <div>{/* Resume content */}</div>;
}
```

#### Example 2: 404 Page

```jsx
export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <CharacterMessage
        type="not-found"
        size={150}
        action={
          <Link to="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        }
      />
    </div>
  );
}
```

#### Example 3: Loading with Custom Message

```jsx
export default function ResumeEditPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <LoadingSpinner
        message="이력서를 불러오는 중입니다..."
        size={140}
      />
    );
  }

  return <div>{/* Resume editor */}</div>;
}
```

### Character Design Principles

1. **Consistency**: Always use theme-appropriate character
2. **Meaningful**: Match character state to UI context
3. **Delightful**: Add personality without overwhelming
4. **Accessible**: Provide text alternatives
5. **Performant**: Optimize animations for all devices

### Future Character Extensions

Potential future additions to the character system:

- **Seasonal variations** (Spring flowers, Winter snow)
- **Achievement celebrations** (Party hat, confetti)
- **Micro-interactions** (React to user actions)
- **Additional emotions** (Happy, surprised, thinking)
- **Multiple poses** (Sitting, standing, flying)

## Implementation Guidelines

### Do's ✅
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing using the spacing scale
- Use semantic HTML elements
- Ensure all interactive elements have hover/focus states
- Test color contrast for accessibility

### Don'ts ❌
- Don't use arbitrary values (e.g., `w-[123px]`)
- Don't mix color schemes
- Don't use pure black (`#000000`)
- Don't create custom CSS unless absolutely necessary
- Don't use animations longer than 300ms
- Don't break the grid system

## Examples

### Page Header
```jsx
<div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-lg p-8">
  <div className="flex items-center gap-3 mb-3">
    <span className="text-3xl">📚</span>
    <h1 className="text-4xl font-bold text-amber-900">
      {user.name}님의 기록장
    </h1>
  </div>
  <p className="text-gray-600 ml-12">
    오늘도 나에 대한 기록을 시작해보세요
  </p>
</div>
```

### Feature Card
```jsx
<div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6
                hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 transition-all">
  <div className="text-5xl mb-4">📄</div>
  <h3 className="text-xl font-bold text-amber-900 mb-2">이력서</h3>
  <p className="text-gray-600 text-sm">나의 커리어를 기록하고 관리하세요</p>
</div>
```

### Form
```jsx
<form className="space-y-5">
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      이메일
    </label>
    <input
      type="email"
      className="w-full px-4 py-3 bg-white text-gray-900 border border-amber-200 rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-amber-400
                 focus:border-transparent transition-all placeholder:text-gray-400"
      placeholder="your@email.com"
    />
  </div>
  <button className="w-full bg-gradient-to-r from-amber-700 to-amber-600
                     hover:from-amber-800 hover:to-amber-700 text-white
                     font-semibold py-3 px-4 rounded-lg transition-all
                     transform hover:scale-[1.02] shadow-lg shadow-amber-700/30">
    로그인
  </button>
</form>
```

## UI Component Library

> **Status**: ✅ Complete (2025-11-21)
> **Coverage**: ~95% of form inputs and buttons across the application
> **Location**: `apps/web-main/src/components/ui/`

### Overview

The UI Component Library extracts repeated patterns into reusable components, reducing code duplication and improving maintainability across the application.

**Key Metrics**:
- **Components**: 10 total (Form: 4, Button: 3, Layout/Feedback: 3)
- **Code Reduction**: 305 lines eliminated (~21%)
- **Bundle Impact**: Minimal (-6KB)
- **Adoption**: ~95% (36 files migrated)
- **Build Time**: ~8.6s (consistent)

### Component Catalog

#### Form Components (4)

##### TextInput

Single-line text input with label, error, and hint support.

**Props**:
```typescript
interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'password' | 'url' | 'month';
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  maxLength?: number;
  className?: string;
  onBlur?: () => void;
}
```

**Example**:
```jsx
<TextInput
  label="Email Address"
  value={email}
  onChange={(value) => setEmail(value)}
  type="email"
  placeholder="your@email.com"
  required
  error={errors.email}
  hint="We'll never share your email"
/>
```

**Features**:
- Built-in label, error, and hint rendering
- Focus ring with amber-400
- Dark mode support
- Accessible with proper ARIA attributes
- Character counter when maxLength is set

##### Select

Dropdown component with options array.

**Props**:
```typescript
interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}
```

**Example**:
```jsx
<Select
  label="Country"
  value={country}
  onChange={(value) => setCountry(value)}
  options={[
    { value: '', label: 'Select a country' },
    { value: 'kr', label: '대한민국' },
    { value: 'us', label: 'United States' },
    { value: 'jp', label: '日本' },
  ]}
  required
  error={errors.country}
/>
```

**Features**:
- Native `<select>` element (no custom dropdown)
- Consistent styling with TextInput
- Dark mode support
- Keyboard accessible

##### TextArea

Multi-line text input with character counter.

**Props**:
```typescript
interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}
```

**Example**:
```jsx
<TextArea
  label="Summary"
  value={summary}
  onChange={(value) => setSummary(value)}
  rows={4}
  maxLength={500}
  placeholder="Write a brief summary..."
  hint="Highlight your key achievements and skills"
/>
```

**Features**:
- Auto-growing height based on rows prop
- Character counter (e.g., "245 / 500")
- Resize handle (vertical only)
- Dark mode support

##### FileUpload

Drag-and-drop file upload component.

**Props**:
```typescript
interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number;
  onUpload: (file: File) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}
```

**Example**:
```jsx
<FileUpload
  label="Profile Photo"
  accept="image/*"
  maxSize={5 * 1024 * 1024} // 5MB
  onUpload={(file) => handlePhotoUpload(file)}
  hint="PNG, JPG up to 5MB"
/>
```

**Features**:
- Drag-and-drop support
- Click to browse files
- Visual feedback on drag over
- File size validation
- Accept attribute for file type filtering

#### Button Components (3)

##### PrimaryButton

Primary action button with amber gradient.

**Props**:
```typescript
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Example**:
```jsx
<PrimaryButton onClick={handleSubmit} disabled={loading}>
  Save Changes
</PrimaryButton>

<PrimaryButton size="sm">Small Action</PrimaryButton>
<PrimaryButton size="lg">Large CTA</PrimaryButton>
```

**Styling**:
- Light mode: `bg-gradient-to-r from-amber-700 to-amber-600`
- Dark mode: `bg-gradient-to-r from-amber-400 to-amber-500`
- Hover: Scale animation (1.02)
- Active: Scale animation (0.98)
- Shadow: `shadow-lg shadow-amber-700/30`

##### SecondaryButton

Secondary action button with gray background.

**Example**:
```jsx
<SecondaryButton onClick={handleCancel}>
  Cancel
</SecondaryButton>
```

**Styling**:
- Light mode: `bg-gray-100 border-gray-300 text-gray-700`
- Dark mode: `bg-dark-bg-secondary border-dark-border-default text-dark-text-primary`
- Hover: Lighter background

##### DestructiveButton

Destructive action button for delete/remove operations.

**Example**:
```jsx
<DestructiveButton onClick={handleDelete}>
  Delete Resume
</DestructiveButton>
```

**Styling**:
- Light mode: `bg-red-600 text-white`
- Dark mode: `bg-red-700 text-white`
- Hover: Darker red
- Warning color for dangerous actions

**Button Sizes**:
- `sm`: `px-3 py-1.5 text-sm` - Compact layouts
- `md`: `px-4 py-2 text-base` - Default
- `lg`: `px-6 py-3 text-lg` - Hero sections

#### Layout & Feedback (3)

##### Card

Content container with multiple variants.

**Props**:
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated';
  className?: string;
}
```

**Example**:
```jsx
<Card variant="primary">
  <h2 className="text-xl font-bold text-amber-900 mb-2">
    Card Title
  </h2>
  <p className="text-gray-600">Card content goes here...</p>
</Card>
```

**Variants**:
- `primary`: Amber background with subtle opacity
- `secondary`: White background with border
- `elevated`: Higher shadow for emphasis

##### Alert

Status message component with multiple types.

**Props**:
```typescript
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}
```

**Example**:
```jsx
<Alert type="success">Resume saved successfully!</Alert>
<Alert type="error">Failed to save resume. Please try again.</Alert>
<Alert type="warning">Your session will expire in 5 minutes.</Alert>
<Alert type="info">You have 3 resumes. Maximum is 10.</Alert>
```

**Types**:
- `success`: Green background, checkmark icon
- `error`: Red background, X icon
- `warning`: Yellow background, warning icon
- `info`: Blue background, info icon

##### LoadingSpinner

Loading indicator with optional message.

**Props**:
```typescript
interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
  size?: number;
}
```

**Example**:
```jsx
// Inline loading
<LoadingSpinner />

// Full screen overlay
<LoadingSpinner fullScreen message="Loading resume..." />

// Custom size
<LoadingSpinner size={60} />
```

**Features**:
- Amber-colored spinner (brand consistency)
- Optional full-screen overlay
- Theme-aware character animation (Squirrel/Owl)
- Smooth fade-in animation

### Usage Guidelines

#### Import Pattern

Always use barrel imports from `'../../components/ui'`:

```typescript
// ✅ DO - Barrel import
import {
  TextInput,
  Select,
  TextArea,
  PrimaryButton,
  SecondaryButton,
  Card,
} from '../../components/ui';

// ❌ DON'T - Direct imports
import TextInput from '../../components/ui/Form/TextInput';
import PrimaryButton from '../../components/ui/Button/PrimaryButton';
```

#### Migration Pattern

When migrating existing components:

**Before**:
```jsx
<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg..."
  placeholder="Full Name"
/>
```

**After**:
```jsx
<TextInput
  label="Full Name"
  value={name}
  onChange={(value) => setName(value)}
  placeholder="Full Name"
  required
/>
```

**Key Changes**:
- `onChange` callback receives `value` (string) directly, not event
- No need to write className styling - handled internally
- Label is separate prop, not JSX element
- Consistent prop API across all components

#### Common Props

All form components share these common props:

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string?` | Input label text |
| `value` | `string` | Current value |
| `onChange` | `(value: string) => void` | Value change handler |
| `placeholder` | `string?` | Placeholder text |
| `required` | `boolean?` | Shows asterisk in label |
| `error` | `string?` | Error message |
| `hint` | `string?` | Helper text |
| `disabled` | `boolean?` | Disable input |
| `className` | `string?` | Additional classes |

All button components share these props:

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Button content |
| `onClick` | `() => void?` | Click handler |
| `disabled` | `boolean?` | Disable button |
| `type` | `'button' \| 'submit' \| 'reset'?` | Button type |
| `size` | `'sm' \| 'md' \| 'lg'?` | Button size |
| `className` | `string?` | Additional classes |

#### Dark Mode Support

All components automatically support dark mode using Tailwind's `dark:` variant:

```jsx
// Automatically adapts to theme
<TextInput
  label="Email"
  value={email}
  onChange={setEmail}
/>

// Light mode: amber-200 border, gray-900 text, white background
// Dark mode: dark-border-default border, dark-text-primary text, dark-bg-secondary background
```

**Implementation**:
```jsx
className="w-full px-4 py-3
           bg-white dark:bg-dark-bg-secondary
           text-gray-900 dark:text-dark-text-primary
           border border-amber-200 dark:border-dark-border-default
           focus:ring-amber-400 dark:focus:ring-amber-500"
```

#### Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Labels**: Proper `<label>` elements with `htmlFor`
- **Errors**: `aria-invalid` and `aria-describedby` for screen readers
- **Focus**: Visible focus rings (amber-400)
- **Keyboard**: Full keyboard navigation support
- **Contrast**: 7:1 minimum text contrast ratio

**Example**:
```jsx
<div>
  <label htmlFor="email-input" className="...">
    Email Address {required && <span className="text-red-500">*</span>}
  </label>
  <input
    id="email-input"
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : hint ? "email-hint" : undefined}
    {...props}
  />
  {error && <p id="email-error" className="text-red-600">{error}</p>}
  {hint && <p id="email-hint" className="text-gray-500">{hint}</p>}
</div>
```

### File Structure

```
apps/web-main/src/components/ui/
├── index.ts                    # Barrel exports
├── Form/
│   ├── TextInput.tsx           # Single-line text input
│   ├── Select.tsx              # Dropdown
│   ├── TextArea.tsx            # Multi-line text input
│   └── FileUpload.tsx          # Drag-and-drop file upload
├── Button/
│   ├── PrimaryButton.tsx       # Amber gradient primary button
│   ├── SecondaryButton.tsx     # Gray secondary button
│   └── DestructiveButton.tsx   # Red destructive button
└── Layout/
    ├── Card.tsx                # Content container
    ├── Alert.tsx               # Status messages
    └── LoadingSpinner.tsx      # Loading indicator
```

### Testing

All components have unit tests with Vitest + React Testing Library:

```bash
# Run component tests
cd apps/web-main
pnpm test src/components/ui

# Test coverage
pnpm test:coverage
```

**Test Coverage**: 80% minimum

**Example Test**:
```typescript
describe('TextInput', () => {
  it('renders label and input', () => {
    render(<TextInput label="Name" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<TextInput label="Email" value="" onChange={() => {}} error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('calls onChange with value', () => {
    const handleChange = vi.fn();
    render(<TextInput label="Name" value="" onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    expect(handleChange).toHaveBeenCalledWith('John');
  });
});
```

### Migration Status

**Phase 1 (Auth Pages)**: ✅ Complete
- LoginPage.tsx
- RegisterPage.tsx
- ChangePasswordPage.tsx

**Phase 2 (Resume Form - Basic Info)**: ✅ Complete
- ResumeForm.tsx (Settings, Basic Info, Summary sections)

**Phase 3 (Resume Form - Sections)**: ✅ Complete
- ResumeForm.tsx (Key Achievements, Application Reason sections)
- EducationSection.tsx (3 inputs, 2 selects, 2 buttons)
- ExperienceSection.tsx (company + project fields)

**Phase 4 (Final Migration)**: ✅ Complete
- ResumeForm.tsx (Skills, Certificates sections)
- MyResumePage.tsx (9 buttons)
- ResumePreviewPage.tsx (6 buttons)
- ResumeEditPage.tsx (1 button)

**Total Impact**:
- Files migrated: 36
- Components replaced: ~300 instances
- Code reduction: 305 lines (-21%)
- Build time: Consistent (~8.6s)
- Bundle size: -6KB

### Best Practices

#### Do's ✅

- Use barrel imports from `'../../components/ui'`
- Provide meaningful labels for accessibility
- Use appropriate button types (Primary, Secondary, Destructive)
- Add error/hint messages for better UX
- Test components with dark mode enabled
- Follow the consistent prop API pattern
- Use TypeScript for type safety

#### Don'ts ❌

- Don't bypass components with direct HTML (breaks consistency)
- Don't use arbitrary Tailwind classes on components (use className sparingly)
- Don't mix old patterns with new components in the same file
- Don't forget to add `required` prop when input is mandatory
- Don't use wrong button types (e.g., PrimaryButton for delete)
- Don't skip accessibility attributes
- Don't create custom styles when component props suffice

### Future Enhancements

Potential component library extensions:

- **Modal/Dialog**: Reusable modal component
- **Tooltip**: Hover tooltips for help text
- **Badge**: Status badges (new, updated, etc.)
- **Tabs**: Tab navigation component
- **DatePicker**: Calendar-based date selection
- **Toggle**: On/off switch component
- **Radio Group**: Radio button group
- **Checkbox**: Single checkbox component

### Related Documentation

- **Quick Reference**: `.ai/apps/web-main.md` - LLM-optimized component guide
- **Design Guidelines**: This file - Comprehensive design system
- **Component API**: TypeScript interfaces in component files
- **Migration Guide**: Issue #135 - Step-by-step migration process

## References

- Tailwind CSS Documentation: https://tailwindcss.com/docs
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Material Design Color Tool: https://material.io/resources/color/

## Version History

- v1.2.0 (2025-11-21): Added UI Component Library documentation - 10 reusable components with ~95% adoption
- v1.1.0 (2025-01-15): Added comprehensive mobile-first responsive design patterns and guidelines
- v1.0.0 (2025-01-09): Initial design system with library theme
