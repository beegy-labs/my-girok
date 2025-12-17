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

## Scalable Theme Architecture (2025-12)

The theme system uses a 3-layer architecture for easy extensibility:

```
Layer 1: Palette (--palette-*)  → Raw colors, defined once, never use directly
Layer 2: Semantic (--theme-*)   → Theme-switchable via [data-theme] attribute
Layer 3: Tailwind (@theme)      → Maps to utilities (bg-theme-*, text-theme-*)
```

### Usage in Components

```tsx
// ✅ Use semantic theme classes (auto-adapts to theme)
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">

// ✅ Use themed shadows
<div className="shadow-theme-lg">
```

### Adding a New Theme

Only modify `apps/web-main/src/index.css`:

```css
[data-theme="ocean"] {
  --theme-bg-page: #0a192f;
  --theme-bg-card: #112240;
  --theme-text-primary: #ccd6f6;
  /* ... map all semantic tokens ... */
}
```

Then update `apps/web-main/src/types/theme.ts` to include the new theme name.

### Key Theme Tokens

| Token | Usage |
|-------|-------|
| `bg-theme-bg-page` | Page background |
| `bg-theme-bg-card` | Card backgrounds |
| `bg-theme-bg-elevated` | Elevated surfaces |
| `text-theme-text-primary` | Primary text |
| `text-theme-text-secondary` | Secondary text |
| `border-theme-border-subtle` | Subtle borders |
| `shadow-theme-lg` | Large shadows |
| `text-theme-primary` | Primary accent color |

### When to Use `dark:` Variant

The `dark:` Tailwind variant is **only** for semantic colors (error, success, warning, info) that need explicit dark mode handling:

```tsx
// ✅ OK - Semantic colors (not themed)
<div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
<div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">

// ❌ DON'T - Theme colors (use theme-* instead)
<div className="bg-vintage-bg-card dark:bg-dark-bg-card">
```

## Color Palette

### Theme: "Clean White Oak" (Light) + "Midnight Gentle Study" (Dark)

**Design Philosophy**: A professional archive aesthetic focused on WCAG 2.1 AA accessibility compliance. Clean, minimal design that reduces eye strain and improves readability for extended use.

**Key Principles**:
- All color combinations meet WCAG 2.1 AA 4.5:1 contrast ratio
- Typography optimized for readability (line-height 1.8, min 16px)
- Warm, earthy tones for a professional archive feel
- Consistent semantic color tokens across themes

### Light Mode - Clean White Oak

#### Background Colors
```css
--light-bg-page: #FFFFFF;           /* Pure white - Page background */
--light-bg-card: #F8F7F4;           /* Off-white oak - Card backgrounds */
--light-bg-elevated: #F2F0EC;       /* Light cream - Elevated surfaces */
--light-bg-hover: #ECEAE5;          /* Hover states */
--light-bg-input: #FFFFFF;          /* Form inputs */
```

#### Text Colors
```css
--light-text-primary: #262220;      /* Near-black warm - Main text (13.5:1 contrast) */
--light-text-secondary: #4A4641;    /* Medium warm - Body text (7.2:1 contrast) */
--light-text-tertiary: #6E6A65;     /* Light warm - Secondary text (4.8:1 contrast) */
--light-text-muted: #8A8681;        /* Muted - Hints, captions */
```

#### Primary & Accent Colors
```css
--light-primary: #8B5E3C;           /* Warm brown - Primary accent (5.8:1 contrast) */
--light-primary-dark: #6B4A2E;      /* Dark brown - Hover states */
--light-primary-light: #A67A54;     /* Light brown - Light variant */
```

#### Border Colors
```css
--light-border-default: #D9D5D0;    /* Default borders */
--light-border-subtle: #E8E5E0;     /* Subtle borders */
```

### Dark Mode - Midnight Gentle Study

#### Background Colors
```css
--dark-bg-page: #1E1C1A;            /* Deep warm black - Page background */
--dark-bg-card: #282522;            /* Warm dark gray - Card backgrounds */
--dark-bg-elevated: #322F2B;        /* Elevated surfaces */
--dark-bg-hover: #3D3A35;           /* Hover states */
--dark-bg-input: #242220;           /* Form inputs */
```

#### Text Colors
```css
--dark-text-primary: #B0A9A2;       /* Warm silver - Main text (7.8:1 contrast) */
--dark-text-secondary: #8A847D;     /* Medium silver - Body text (4.9:1 contrast) */
--dark-text-tertiary: #6A655F;      /* Light silver - Secondary text */
--dark-text-muted: #524E49;         /* Muted - Hints, captions */
```

#### Primary & Accent Colors
```css
--dark-primary: #9C835E;            /* Warm gold - Primary accent (5.2:1 contrast) */
--dark-primary-dark: #7A6547;       /* Dark gold - Hover states */
--dark-primary-light: #B89C72;      /* Light gold - Light variant */
```

#### Border Colors
```css
--dark-border-default: #3D3A35;     /* Default borders */
--dark-border-subtle: #2E2B27;      /* Subtle borders */
```

### WCAG 2.1 AA Compliance

All color combinations meet or exceed WCAG 2.1 AA standards:

| Combination | Contrast Ratio | WCAG Level |
|-------------|----------------|------------|
| Light primary text on card | 13.5:1 | AAA |
| Light secondary text on card | 7.2:1 | AAA |
| Light primary accent on card | 5.8:1 | AA |
| Dark primary text on card | 7.8:1 | AAA |
| Dark secondary text on card | 4.9:1 | AA |
| Dark primary accent on card | 5.2:1 | AA |

### Usage Guidelines

#### Semantic Token Usage
```tsx
// ✅ Use semantic theme classes (auto-adapts to theme)
<div className="bg-theme-bg-card text-theme-text-primary">
  <h2 className="text-theme-text-primary">Title</h2>
  <p className="text-theme-text-secondary">Description</p>
</div>

// ❌ Don't use raw color values
<div style={{ backgroundColor: '#F8F7F4' }}>
```

#### Background Hierarchy
- **Page Background**: `bg-theme-bg-page` - Base layer
- **Cards/Content**: `bg-theme-bg-card` - Content containers
- **Elevated**: `bg-theme-bg-elevated` - Modals, dropdowns
- **Hover**: `bg-theme-bg-hover` - Interactive hover states

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

### WCAG-Optimized Settings

**Core Settings**:
```css
:root {
  font-size: 16px;           /* Minimum for WCAG 2.1 AA */
  line-height: 1.8;          /* Improved readability */
  letter-spacing: -0.02em;   /* Korean/CJK optimization */
}
```

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans", sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";

/* Logo/Brand: Monospace */
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Font Sizes
```css
--text-5xl: 3rem;     /* 48px - Hero headings */
--text-4xl: 2.25rem;  /* 36px - Page titles */
--text-3xl: 1.875rem; /* 30px - Section headers */
--text-2xl: 1.5rem;   /* 24px - Card headers */
--text-xl: 1.25rem;   /* 20px - Subheadings */
--text-lg: 1.125rem;  /* 18px - Large body text */
--text-base: 1rem;    /* 16px - Body text (minimum) */
--text-sm: 0.875rem;  /* 14px - Small text (limited use) */
--text-xs: 0.75rem;   /* 12px - Captions only */
```

**Important**: Minimum font size for body text is 16px (1rem) per WCAG 2.1 AA guidelines.

### Font Weights
```css
--font-bold: 700;     /* Headers, emphasis */
--font-semibold: 600; /* Subheaders, labels */
--font-medium: 500;   /* Buttons, links */
--font-normal: 400;   /* Body text */
```

## Iconography

### Icon Library
**Primary**: Lucide-React icons for consistency and accessibility

### Icon Usage
```tsx
import { Book, FileText, Wallet, Settings, Sun, Moon } from 'lucide-react';

// Standard icon with WCAG touch target
<button className="p-2.5 min-w-[44px] min-h-[44px]">
  <Settings className="w-5 h-5" aria-hidden="true" />
  <span className="sr-only">Settings</span>
</button>
```

### Core Icons
| Icon | Lucide Name | Usage |
|------|-------------|-------|
| Book | `Book` | Records, library |
| FileText | `FileText` | Resume, documents |
| Wallet | `Wallet` | Assets, finance |
| Settings | `Settings` | Configuration |
| Sun | `Sun` | Light mode toggle |
| Moon | `Moon` | Dark mode toggle |
| Loader2 | `Loader2` | Loading states |

### Accessibility
- All icons must have `aria-hidden="true"` when decorative
- Interactive icons need visible labels or `sr-only` text
- Minimum touch target: 44x44px (WCAG 2.5.5)

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

#### Pattern 9: Depth Colors for Hierarchical Data

Use color-coded left borders for nested/hierarchical items (achievements, descriptions):

```typescript
// Define depth colors constant
const DEPTH_COLORS = {
  1: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500' },
  2: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500' },
  3: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-500' },
  4: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-l-orange-500' },
} as const;

// Usage in component
const depthColor = DEPTH_COLORS[depth as keyof typeof DEPTH_COLORS] || DEPTH_COLORS[4];

<div className={`${depthColor.bg} border-l-4 ${depthColor.border} rounded-lg p-2`}>
  {/* Nested item content */}
</div>
```

**Benefits**:
- Visual hierarchy without deep indentation (saves horizontal space on mobile)
- Color coding helps users understand nesting level at a glance
- Consistent pattern across hierarchical components

#### Pattern 10: Collapsible Cards on Mobile

Cards with detailed content should be collapsible on mobile with summary when collapsed:

```typescript
const [isExpanded, setIsExpanded] = useState(true);

// Clickable header on mobile
<button
  type="button"
  onClick={() => setIsExpanded(!isExpanded)}
  className="flex-1 flex items-center gap-2 text-left min-w-0 sm:cursor-default"
>
  <div className="flex-1 min-w-0">
    <h3 className="font-bold truncate">{title}</h3>
    {/* Summary shown only when collapsed on mobile */}
    {!isExpanded && (
      <p className="text-xs text-gray-500 truncate sm:hidden">
        {summary} • {date}
      </p>
    )}
  </div>
  {/* Chevron indicator - mobile only */}
  <svg
    className={`w-5 h-5 transition-transform sm:hidden ${isExpanded ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
</button>

// Content - collapsible on mobile, always visible on desktop
<div className={`${isExpanded ? 'block' : 'hidden'} sm:block p-3 sm:p-6`}>
  {/* Card content */}
</div>
```

**Key Points**:
- Use `sm:cursor-default` to prevent pointer cursor on desktop
- Show summary (position, date) when collapsed for context
- Use `truncate` to prevent text overflow
- Animate chevron rotation for visual feedback

#### Pattern 11: Inline Icon Buttons on Mobile

Replace text buttons with compact icon buttons on mobile:

```jsx
{/* Desktop: text buttons with labels */}
<div className="hidden sm:flex items-center gap-2">
  <button className="px-2 py-1 bg-green-50 border border-green-300 text-green-700 text-xs rounded">
    + Add Sub-item
  </button>
  <button className="text-red-600 text-xs font-semibold">
    Remove
  </button>
</div>

{/* Mobile: compact 24x24px icon buttons */}
<div className="sm:hidden flex items-center gap-0.5">
  <button className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 text-[10px] rounded touch-manipulation">
    +
  </button>
  <button className="w-6 h-6 flex items-center justify-center text-red-600 hover:bg-red-50 rounded text-[10px] touch-manipulation">
    ✕
  </button>
</div>
```

**Sizing Guidelines**:
- Minimum touch target: 24x24px (w-6 h-6) for inline actions
- Use `text-[10px]` for icon text
- Add `touch-manipulation` for faster touch response
- Use `flex items-center justify-center` for centering

#### Pattern 12: Fixed Bottom Navigation Bar

For pages with important actions, use fixed bottom bar on mobile:

```jsx
{/* Fixed bottom navigation - mobile only */}
<div className="fixed bottom-0 left-0 right-0 z-50
                bg-white dark:bg-dark-bg-card
                border-t border-gray-200 dark:border-dark-border-default
                p-3 lg:hidden safe-area-bottom">
  <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
    <SecondaryButton onClick={() => navigate(-1)} size="sm" className="flex-1 py-3 text-sm">
      ← Back
    </SecondaryButton>
    <PrimaryButton onClick={togglePreview} size="sm" className="flex-1 py-3 text-sm">
      {showPreview ? '📝 Edit' : '👁️ Preview'}
    </PrimaryButton>
  </div>
</div>

{/* Add padding to main content to prevent overlap */}
<main className="pb-20 lg:pb-0">
  {/* Page content */}
</main>
```

**Key Points**:
- Use `safe-area-bottom` class for iPhone notch compatibility
- `z-50` ensures bar stays above other content
- `lg:hidden` hides on desktop where space is available
- Add `pb-20` to main content to prevent overlap

#### Pattern 13: TouchSensor for Mobile Drag-and-Drop

When using `@dnd-kit` for drag-and-drop, include TouchSensor for mobile support:

```typescript
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Configure sensors with activation constraints
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 } // 8px movement before drag starts
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,      // 200ms hold before drag
      tolerance: 5     // 5px movement allowed during delay
    }
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  })
);

// Use in DndContext
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  {/* Sortable content */}
</DndContext>
```

**Activation Constraint Explained**:
- `distance: 8` - PointerSensor requires 8px movement to start drag (prevents accidental drags)
- `delay: 200` - TouchSensor requires 200ms hold before drag starts (allows scrolling)
- `tolerance: 5` - User can move 5px during delay without canceling (accounts for finger jitter)

**Without these constraints**: Touch scrolling will trigger drag, making the list unusable on mobile.

#### Mobile-First Development Checklist

When implementing responsive designs:

- [ ] Design for mobile first (320px - 375px width)
- [ ] Use `sm:` prefix for tablet breakpoint (≥640px)
- [ ] Use `lg:` prefix for desktop breakpoint (≥1024px)
- [ ] Test on actual mobile devices or DevTools
- [ ] Ensure all text is readable (minimum 14px/0.875rem)
- [ ] Ensure touch targets are at least 44x44px (or 24x24px for inline icons)
- [ ] Use `flex-col` on mobile, `sm:flex-row` on larger screens
- [ ] Reduce padding/spacing on mobile (`p-4 sm:p-6 lg:p-8`)
- [ ] Make buttons full-width on mobile when appropriate
- [ ] Use 2-column grid on mobile for action buttons
- [ ] Prevent horizontal scrolling with `break-words`, `flex-wrap`
- [ ] Use `whitespace-nowrap` for button text
- [ ] Hide non-essential elements on mobile with `lg:hidden`
- [ ] Test modals/dialogs with mobile padding (`p-4`)
- [ ] Ensure navbar is usable on small screens
- [ ] Add `touch-manipulation` to interactive elements
- [ ] Use collapsible cards for complex forms on mobile
- [ ] Include TouchSensor for drag-and-drop components
- [ ] Use depth colors for hierarchical/nested data

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

## Status & Loading Components

### Overview

WCAG-compliant components for loading states, error messages, and status feedback. These replace the previous character mascot system with simple, accessible Lucide-React icons.

### LoadingSpinner

Simple loading indicator using Lucide's `Loader2` icon with spinning animation.

```tsx
import LoadingSpinner from './components/LoadingSpinner';

// Inline loading
<LoadingSpinner />

// Full screen overlay
<LoadingSpinner fullScreen />

// Custom message
<LoadingSpinner message="Loading resume..." />

// Size variants
<LoadingSpinner size="sm" />  // 24px
<LoadingSpinner size="md" />  // 40px (default)
<LoadingSpinner size="lg" />  // 64px
```

**Accessibility**:
- Uses `role="status"` and `aria-live="polite"` for screen readers
- Icon has `aria-hidden="true"` (decorative)
- Text message is always visible for screen reader users

### StatusMessage

WCAG-compliant status/error message component with icon, title, message, and optional action.

```tsx
import StatusMessage from './components/StatusMessage';

// Error states
<StatusMessage type="error" />
<StatusMessage type="not-found" />
<StatusMessage type="expired" />
<StatusMessage type="no-permission" />
<StatusMessage type="maintenance" />
<StatusMessage type="deleted" />

// With custom action
<StatusMessage
  type="not-found"
  action={
    <Button onClick={() => navigate('/')}>
      Go Home
    </Button>
  }
/>

// Custom title and message
<StatusMessage
  type="error"
  title="Custom Title"
  message="Custom error message"
/>
```

### Status Type Reference

| Type | Icon | Use Case |
|------|------|----------|
| `error` | AlertCircle | System errors, failures |
| `not-found` | FileQuestion | 404 pages, missing content |
| `expired` | Clock | Expired links/sessions |
| `no-permission` | Lock | Access denied |
| `maintenance` | Wrench | System maintenance |
| `deleted` | Trash2 | Deleted content |
| `warning` | AlertTriangle | Warning messages |

### File Locations

```
apps/web-main/src/components/
├── LoadingSpinner.tsx      # Loading indicator (Loader2 icon)
├── StatusMessage.tsx       # Status/error messages (multiple icons)
└── ErrorBoundary.tsx       # Error boundary with StatusMessage
```

### Usage Examples

#### 404 Page

```tsx
export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <StatusMessage
        type="not-found"
        action={
          <Link to="/">
            <Button variant="primary">Go Home</Button>
          </Link>
        }
      />
    </div>
  );
}
```

#### Shared Resume Error States

```tsx
if (error) {
  const messageType = {
    'EXPIRED': 'expired',
    'DELETED': 'deleted',
    'NO_PERMISSION': 'no-permission',
    'NOT_FOUND': 'not-found',
  }[errorCode] || 'error';

  return (
    <StatusMessage
      type={messageType}
      message={error}
      action={<Button onClick={() => navigate('/')}>Go Home</Button>}
    />
  );
}
```

### Accessibility Features

All status components follow WCAG 2.1 AA guidelines:

- **Screen Reader**: Uses `role="status"` and `aria-live="polite"`
- **Icons**: All icons have `aria-hidden="true"` (decorative)
- **Focus**: Action buttons are keyboard accessible
- **Contrast**: All text meets 4.5:1 minimum contrast ratio
- **Touch Targets**: Buttons meet 44x44px minimum size

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

> **Status**: ✅ Consolidated (2025-12-17)
> **Location**: `packages/ui-components/src/`

### Overview

The UI Component Library extracts repeated UI patterns into reusable, theme-aware components. This single, centralized library is consumed by all frontend applications within the monorepo, ensuring consistency and maintainability.

**Key Metrics**:
- **Components**: 11 total
- **Adoption**: 100% (All pages refactored to use this library)
- **Architecture**: Single source of truth for all UI components.

### Component Catalog

#### Form Components

##### Button

A multi-variant button with support for loading states, sizes, and icons.

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}
```

**Example**:
```jsx
<Button variant="primary" onClick={handleSubmit} loading={isLoading}>
  Save Changes
</Button>

<Button variant="secondary" size="sm">Cancel</Button>

<Button variant="danger">Delete</Button>
```

##### TextInput

A theme-aware, single-line text input with a simplified `onChange` handler.

**Props**:
```typescript
interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void; // Simplified handler
  error?: string;
  hint?: string;
  // ...other standard input props
}
```

**Example**:
```jsx
<TextInput
  label="Email Address"
  value={email}
  onChange={setEmail} // Directly pass the state setter
  error={errors.email}
  hint="We'll never share your email."
/>
```

##### SelectInput

A theme-aware `<select>` dropdown with a simplified `onChange` handler.

**Example**:
```jsx
<SelectInput
  label="Country"
  value={country}
  onChange={setCountry} // Simplified handler
  options={[{ value: 'kr', label: '대한민국' }]}
/>
```

#### Layout & Feedback

##### Card

A versatile, theme-aware content container with multiple variants.

**Example**:
```jsx
<Card variant="primary" padding="lg">
  <h2>Card Title</h2>
  <p>Card content...</p>
</Card>
```

##### Alert

A component for status messages with variants for success, error, warning, and info.

**Example**:
```jsx
<Alert variant="success">Resume saved successfully!</Alert>
<Alert variant="error">{error}</Alert>
```

##### PageHeader, SectionHeader, PageContainer

Components for building consistent page layouts.

### File Structure

```
packages/ui-components/src/components/
├── Alert.tsx
├── Button.tsx
├── Card.tsx
├── CollapsibleSection.tsx
├── index.ts
├── PageContainer.tsx
├── PageHeader.tsx
├── SectionHeader.tsx
├── SelectInput.tsx
├── SortableItem.tsx
├── SortableList.tsx
└── TextInput.tsx
```

### Usage Guidelines

#### Import Pattern

Always use barrel imports from the `@my-girok/ui-components` package.

```typescript
// ✅ DO - Barrel import from the package
import {
  Button,
  Card,
  TextInput,
  SelectInput,
  Alert,
  PageHeader,
} from '@my-girok/ui-components';

// ❌ DON'T - Use relative paths
import Card from '../../../packages/ui-components/src/components/Card';
```

#### Migration Pattern (Example)

**Before**:
```jsx
// From apps/web-main/src/components/ui/Button/PrimaryButton.tsx
<PrimaryButton onClick={submit}>Save</PrimaryButton>
```

**After**:
```jsx
// From @my-girok/ui-components
<Button variant="primary" onClick={submit}>Save</Button>
```

**Key Changes**:
- **Single `Button` Component**: `PrimaryButton`, `SecondaryButton`, etc., are replaced by a single `Button` component with a `variant` prop.
- **Simplified `onChange`**: Form components now use `onChange={setValue}` directly, thanks to the `(value: string) => void` signature.

### Best Practices

#### Do's ✅

- Use the single source of truth: `@my-girok/ui-components`.
- Provide meaningful labels for accessibility.
- Use the `variant` prop on `Button` for different actions.
- Add `error`/`hint` messages to `TextInput` for better UX.
- Test components with dark mode enabled.

#### Don'ts ❌

- **Don't use the old library**: Avoid any component from `apps/web-main/src/components/ui`.
- Don't bypass components with direct HTML (breaks consistency).
- Don't use arbitrary Tailwind classes on components (use `className` sparingly).
- Don't use the wrong button variant (e.g., `variant="primary"` for a delete action).
- Don't forget accessibility attributes.
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

## Scalable Theme System (2025-12)

### Overview

The theme system was refactored to support N themes with minimal code changes. Previously, adding a new theme required modifying 46+ component files with `vintage-* dark:dark-*` patterns. Now, adding a theme requires modifying only 1-2 CSS files.

### Architecture: 3-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: PALETTE                                           │
│  Raw colors - Never use directly in components              │
│  --palette-wood-900, --palette-slate-900, etc.              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: SEMANTIC TOKENS                                   │
│  Theme-switchable via [data-theme="..."] selector           │
│  --theme-bg-page, --theme-text-primary, etc.                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: TAILWIND INTEGRATION                              │
│  @theme directive maps to utility classes                   │
│  bg-theme-bg-page, text-theme-text-primary, etc.            │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Palette (Raw Colors)

```css
:root {
  /* Wood Library Palette (Vintage Theme) */
  --palette-wood-900: #1A1612;
  --palette-wood-800: #231E18;
  --palette-paper-100: #EDE8E0;
  --palette-amber-600: #A0522D;
  --palette-burgundy-600: #8B4343;

  /* Moonlit Library Palette (Dark Theme) */
  --palette-slate-900: #0F1419;
  --palette-slate-800: #1A1D23;
  --palette-silver-100: #E8E6E3;
  --palette-steel-400: #52575F;
}
```

**Rule**: Never reference `--palette-*` variables directly in components. Always use semantic tokens.

### Layer 2: Semantic Tokens

```css
:root {
  /* Default theme = vintage */
  --theme-bg-page: var(--palette-wood-900);
  --theme-bg-card: var(--palette-wood-700);
  --theme-text-primary: var(--palette-paper-100);
  --theme-border-subtle: var(--palette-grain-300);
  --theme-shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.6);
}

[data-theme="dark"] {
  --theme-bg-page: var(--palette-slate-900);
  --theme-bg-card: var(--palette-slate-700);
  --theme-text-primary: var(--palette-silver-100);
  --theme-border-subtle: var(--palette-steel-300);
  --theme-shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.5);
}
```

**Theme Switching**: Set `data-theme` attribute on `<html>` element.

### Layer 3: Tailwind Integration

```css
@theme {
  /* Maps semantic tokens to Tailwind utilities */
  --color-theme-bg-page: var(--theme-bg-page);
  --color-theme-bg-card: var(--theme-bg-card);
  --color-theme-text-primary: var(--theme-text-primary);
  --color-theme-border-subtle: var(--theme-border-subtle);
  --shadow-theme-lg: var(--theme-shadow-lg);
}
```

**Result**: Use `bg-theme-bg-page`, `text-theme-text-primary`, `shadow-theme-lg` in components.

### Adding a New Theme

To add a new theme (e.g., "ocean"):

**Step 1**: Add palette colors (if needed)
```css
:root {
  --palette-ocean-900: #0a192f;
  --palette-ocean-100: #ccd6f6;
}
```

**Step 2**: Add theme override
```css
[data-theme="ocean"] {
  --theme-bg-page: var(--palette-ocean-900);
  --theme-text-primary: var(--palette-ocean-100);
  /* ... other semantic tokens ... */
}
```

**Step 3**: Update ThemeContext (optional)
```tsx
type ThemeName = 'vintage' | 'dark' | 'ocean';
```

**Files modified**: 1-2 (vs 46+ previously)

### Token Reference

| Semantic Token | Vintage (Light) | Dark | Tailwind Class |
|---------------|-----------------|------|----------------|
| `--theme-bg-page` | #1A1612 | #0F1419 | `bg-theme-bg-page` |
| `--theme-bg-card` | #2D261E | #242830 | `bg-theme-bg-card` |
| `--theme-bg-elevated` | #3A3128 | #2D3139 | `bg-theme-bg-elevated` |
| `--theme-bg-hover` | #453A2F | #353A42 | `bg-theme-bg-hover` |
| `--theme-text-primary` | #EDE8E0 | #E8E6E3 | `text-theme-text-primary` |
| `--theme-text-secondary` | #C4BAA8 | #B8B5B2 | `text-theme-text-secondary` |
| `--theme-text-tertiary` | #9A8E7A | #8B8885 | `text-theme-text-tertiary` |
| `--theme-border-subtle` | #3D342A | #3A3D45 | `border-theme-border-subtle` |
| `--theme-border-default` | #554839 | #52575F | `border-theme-border-default` |

### Migration Guide

**Before (Legacy Pattern)**:
```tsx
<div className="bg-vintage-bg-card dark:bg-dark-bg-card
                text-vintage-text-primary dark:text-dark-text-primary
                border-vintage-border-subtle dark:border-dark-border-subtle">
```

**After (Semantic Pattern)**:
```tsx
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
```

### Backward Compatibility

Legacy tokens (`vintage-*`, `dark-*`) are preserved during migration:
- Old code continues to work
- Migrate components incrementally
- Remove legacy tokens after full migration (Phase 8)

### File Locations

```
apps/web-main/src/
├── index.css                  # Theme variables (Layers 1-3) - SINGLE SOURCE OF TRUTH
└── contexts/ThemeContext.tsx  # Theme switching logic
```

**Note**: TypeScript design tokens (`styles/design-tokens.ts`) were removed as an anti-pattern.
Use Tailwind classes directly with theme tokens from `index.css`.

## Version History

- v1.5.1 (2025-12-17): **Remove design-tokens.ts** - Removed TypeScript design tokens anti-pattern, single source of truth is now index.css
- v1.5.0 (2025-12-16): **Scalable Theme System** - 3-layer architecture for N-theme support, semantic tokens, reduced theme change footprint from 46 files to 1-2
- v1.4.0 (2025-12-12): **NEW "Vintage Natural Wood Library" Light Mode Theme** - Replaced bright amber with softer vintage colors (warm ivory, beige backgrounds, stone text colors, olive green accents) for reduced eye strain and natural feel
- v1.3.0 (2025-11-27): Added mobile edit patterns - TouchSensor, depth colors, collapsible cards, inline buttons, fixed bottom nav
- v1.2.0 (2025-11-21): Added UI Component Library documentation - 10 reusable components with ~95% adoption
- v1.1.0 (2025-01-15): Added comprehensive mobile-first responsive design patterns and guidelines
- v1.0.0 (2025-01-09): Initial design system with library theme
