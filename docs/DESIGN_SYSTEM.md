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
sm: 640px;   /* @media (min-width: 640px) */
md: 768px;   /* @media (min-width: 768px) */
lg: 1024px;  /* @media (min-width: 1024px) */
xl: 1280px;  /* @media (min-width: 1280px) */
2xl: 1536px; /* @media (min-width: 1536px) */
```

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

## Dark Mode (Future)

Currently not implemented. When implementing:
- Use `bg-gray-900` for backgrounds
- Use `amber-400` for primary colors (higher luminance)
- Maintain minimum 4.5:1 contrast ratio

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

## References

- Tailwind CSS Documentation: https://tailwindcss.com/docs
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Material Design Color Tool: https://material.io/resources/color/

## Version History

- v1.0.0 (2025-01-09): Initial design system with library theme
