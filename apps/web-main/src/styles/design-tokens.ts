/**
 * Design System Tokens
 *
 * Centralized design tokens for consistent styling across the application.
 * These values should be used instead of hardcoded Tailwind classes.
 *
 * Organization:
 * - Mobile: < 640px (default styles)
 * - Tablet: 640px - 1024px (sm: prefix)
 * - Desktop: > 1024px (lg: prefix)
 */

// =============================================================================
// SPACING
// =============================================================================

/**
 * Standard spacing values (multiples of 4px)
 * Usage: padding, margin, gap
 */
export const spacing = {
  // Page padding
  page: {
    mobile: 'px-4 py-4',
    tablet: 'sm:px-6 sm:py-6',
    desktop: 'lg:px-8 lg:py-8',
    all: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
  },
  // Section spacing
  section: {
    mobile: 'space-y-4',
    tablet: 'sm:space-y-6',
    desktop: 'lg:space-y-8',
    all: 'space-y-4 sm:space-y-6 lg:space-y-8',
  },
  // Card internal padding
  card: {
    mobile: 'p-4',
    tablet: 'sm:p-6',
    desktop: 'lg:p-8',
    all: 'p-4 sm:p-6 lg:p-8',
  },
  // Gap between items
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3 sm:gap-4',
    lg: 'gap-4 sm:gap-6',
    xl: 'gap-6 sm:gap-8',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

/**
 * Typography scales
 * Follows responsive sizing for readability
 */
export const typography = {
  // Page titles (H1)
  pageTitle: {
    mobile: 'text-2xl',
    tablet: 'sm:text-3xl',
    desktop: 'lg:text-4xl',
    all: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  },
  // Section titles (H2)
  sectionTitle: {
    mobile: 'text-xl',
    tablet: 'sm:text-2xl',
    all: 'text-xl sm:text-2xl font-bold',
  },
  // Card titles (H3)
  cardTitle: {
    mobile: 'text-lg',
    tablet: 'sm:text-xl',
    all: 'text-lg sm:text-xl font-bold',
  },
  // Body text
  body: {
    mobile: 'text-sm',
    tablet: 'sm:text-base',
    all: 'text-sm sm:text-base',
  },
  // Small text / captions
  small: {
    mobile: 'text-xs',
    tablet: 'sm:text-sm',
    all: 'text-xs sm:text-sm',
  },
} as const;

// =============================================================================
// COLORS
// =============================================================================

/**
 * Color tokens with dark mode support
 * Theme: "Vintage Natural Wood Library" - 빈티지 자연목 서재
 * Format: `light dark:dark`
 */
export const colors = {
  // Backgrounds (swapped: dark mode colors for light, light mode colors for dark)
  bg: {
    page: 'bg-dark-bg-primary dark:bg-vintage-bg-page',           // swapped
    card: 'bg-dark-bg-card dark:bg-vintage-bg-card',              // swapped
    cardWhite: 'bg-dark-bg-card dark:bg-white',                   // swapped
    elevated: 'bg-dark-bg-elevated dark:bg-vintage-bg-elevated',  // swapped
    input: 'bg-dark-bg-secondary dark:bg-vintage-bg-input',       // swapped
  },
  // Text colors (swapped)
  text: {
    primary: 'text-dark-text-primary dark:text-vintage-text-primary',       // swapped
    secondary: 'text-dark-text-secondary dark:text-vintage-text-secondary', // swapped
    tertiary: 'text-dark-text-tertiary dark:text-vintage-text-tertiary',    // swapped
    muted: 'text-dark-text-disabled dark:text-vintage-text-muted',          // swapped
    accent: 'text-dark-text-primary dark:text-vintage-text-accent',         // swapped
    link: 'text-amber-400 dark:text-vintage-primary',                       // swapped
    linkHover: 'hover:text-amber-300 dark:hover:text-vintage-primary-dark', // swapped
  },
  // Borders (swapped)
  border: {
    subtle: 'border-dark-border-subtle dark:border-vintage-border-subtle',   // swapped
    default: 'border-dark-border-default dark:border-vintage-border-default', // swapped
    strong: 'border-dark-border-strong dark:border-vintage-border-strong',    // swapped
  },
  // Accent colors (swapped)
  accent: {
    primary: 'text-vintage-accent-light dark:text-vintage-accent',      // swapped
    light: 'text-vintage-accent-pale dark:text-vintage-accent-light',   // swapped
    bg: 'bg-vintage-accent/20 dark:bg-vintage-accent/10',               // swapped
  },
  // Status colors (swapped)
  status: {
    success: 'bg-green-900/30 dark:bg-vintage-accent/20 text-green-300 dark:text-vintage-accent-dark',
    error: 'bg-red-900/20 dark:bg-red-50 text-red-400 dark:text-red-700',
    warning: 'bg-yellow-900/20 dark:bg-yellow-50 text-yellow-400 dark:text-yellow-700',
    info: 'bg-blue-900/20 dark:bg-blue-50 text-blue-400 dark:text-blue-700',
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: 'shadow-sm dark:shadow-dark-sm',
  md: 'shadow-md dark:shadow-dark-md',
  lg: 'shadow-lg dark:shadow-dark-lg',
  xl: 'shadow-xl dark:shadow-dark-lg', // Note: dark-xl not defined, using lg
} as const;

// =============================================================================
// BORDERS & RADIUS
// =============================================================================

export const radius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
} as const;

// =============================================================================
// PAGE LAYOUT PATTERNS
// =============================================================================

/**
 * Standard page container patterns
 * Theme: Vintage Natural Wood Library
 */
export const pageLayout = {
  // Full page background (swapped)
  wrapper: 'min-h-screen bg-dark-bg-primary dark:bg-vintage-bg-page transition-colors duration-200',
  // Content container
  container: {
    sm: 'max-w-md mx-auto',
    md: 'max-w-2xl mx-auto',
    lg: 'max-w-4xl mx-auto',
    xl: 'max-w-6xl mx-auto',
    full: 'max-w-7xl mx-auto',
  },
  // Centered content (for auth pages)
  centered: 'min-h-[80vh] flex items-center justify-center px-4',
} as const;

// =============================================================================
// CARD PATTERNS
// =============================================================================

/**
 * Standard card styles
 * Theme: Vintage Natural Wood Library
 */
export const cardStyles = {
  // Primary card (swapped)
  primary: `
    bg-dark-bg-card dark:bg-vintage-bg-card
    border border-dark-border-subtle dark:border-vintage-border-subtle
    rounded-2xl shadow-dark-md dark:shadow-vintage-md
    transition-colors duration-200
  `,
  // Primary card hover (swapped)
  primaryHover: `
    hover:shadow-dark-lg dark:hover:shadow-vintage-lg
    hover:border-amber-500/30 dark:hover:border-vintage-border-default
  `,
  // Secondary card (swapped)
  secondary: `
    bg-dark-bg-card dark:bg-white
    border border-dark-border-default dark:border-vintage-border-default
    rounded-2xl shadow-dark-sm dark:shadow-vintage-sm
    transition-colors duration-200
  `,
  // Elevated card (swapped)
  elevated: `
    bg-dark-bg-card dark:bg-white
    border border-dark-border-subtle dark:border-vintage-border-subtle
    rounded-2xl shadow-dark-lg dark:shadow-vintage-lg
    transition-colors duration-200
  `,
} as const;

// =============================================================================
// BUTTON PATTERNS
// =============================================================================

/**
 * Button base styles (use with UI components when possible)
 * Theme: Vintage Natural Wood Library
 */
export const buttonStyles = {
  // Primary gradient button (swapped)
  primary: `
    bg-gradient-to-r from-amber-400 to-amber-500
    dark:from-vintage-primary-dark dark:to-vintage-primary
    hover:from-amber-300 hover:to-amber-400
    dark:hover:from-vintage-primary dark:hover:to-vintage-primary-light
    text-gray-900 dark:text-white
    font-semibold rounded-lg
    shadow-lg shadow-amber-500/20 dark:shadow-vintage-primary/30
    transform hover:scale-[1.02] active:scale-[0.98]
    transition-all
  `,
  // Secondary button (swapped)
  secondary: `
    bg-dark-bg-elevated dark:bg-vintage-bg-card
    hover:bg-dark-bg-hover dark:hover:bg-vintage-border-subtle
    text-dark-text-primary dark:text-vintage-text-secondary
    border border-dark-border-default dark:border-vintage-border-default
    font-semibold rounded-lg
    transition-all
  `,
  // Destructive button (swapped)
  destructive: `
    bg-red-900/20 dark:bg-red-50
    hover:bg-red-900/30 dark:hover:bg-red-100
    text-red-400 dark:text-red-700
    border border-red-800 dark:border-red-200
    font-semibold rounded-lg
    transition-all
  `,
  // Accent button (swapped)
  accent: `
    bg-vintage-accent-light dark:bg-vintage-accent
    hover:bg-vintage-accent dark:hover:bg-vintage-accent-dark
    text-white dark:text-white
    font-semibold rounded-lg
    shadow-lg shadow-vintage-accent/30
    transform hover:scale-[1.02] active:scale-[0.98]
    transition-all
  `,
} as const;

// =============================================================================
// RESPONSIVE BREAKPOINTS (for reference)
// =============================================================================

/**
 * Tailwind breakpoints
 * - Default: 0-639px (mobile)
 * - sm: 640px+ (tablet portrait)
 * - md: 768px+ (tablet landscape)
 * - lg: 1024px+ (desktop)
 * - xl: 1280px+ (large desktop)
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// =============================================================================
// RESPONSIVE GRID PATTERNS
// =============================================================================

export const gridPatterns = {
  // 1 column mobile, 2 columns tablet, 3 columns desktop
  threeCol: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  // 1 column mobile, 2 columns tablet+
  twoCol: 'grid grid-cols-1 sm:grid-cols-2',
  // Side by side on desktop only
  sideByDesktop: 'grid grid-cols-1 lg:grid-cols-2',
} as const;

// =============================================================================
// MOBILE-SPECIFIC PATTERNS
// =============================================================================

export const mobilePatterns = {
  // Hide on mobile, show on larger screens
  hideOnMobile: 'hidden sm:block',
  hiddenOnMobile: 'hidden sm:flex',
  // Show only on mobile
  showOnMobile: 'block sm:hidden',
  showOnMobileOnly: 'flex sm:hidden',
  // Touch-friendly tap targets (min 44px)
  touchTarget: 'min-h-[44px] min-w-[44px]',
  // Safe area for notch/home indicator
  safeArea: 'safe-area-bottom',
  // Fixed bottom bar (swapped)
  fixedBottom: 'fixed bottom-0 left-0 right-0 z-50 bg-dark-bg-card dark:bg-white border-t border-dark-border-default dark:border-gray-200 p-3',
} as const;

// =============================================================================
// DESKTOP/TABLET PATTERNS
// =============================================================================

export const desktopPatterns = {
  // Hide on desktop, show on mobile
  hideOnDesktop: 'block lg:hidden',
  hiddenOnDesktop: 'flex lg:hidden',
  // Show only on desktop
  showOnDesktop: 'hidden lg:block',
  showOnDesktopOnly: 'hidden lg:flex',
  // Sticky sidebar
  stickySidebar: 'sticky top-4 sm:top-8',
} as const;

// =============================================================================
// ANIMATION CLASSES
// =============================================================================

export const animations = {
  // Loading spinner
  spin: 'animate-spin',
  // Fade in
  fadeIn: 'animate-fade-in',
  // Scale on hover
  scaleHover: 'transform hover:scale-[1.02] active:scale-[0.98]',
  // Transition
  transition: 'transition-all duration-200',
  transitionColors: 'transition-colors duration-200',
} as const;

// =============================================================================
// FORM PATTERNS
// =============================================================================

export const formPatterns = {
  // Form section spacing
  section: 'space-y-6',
  // Input base (swapped)
  input: `
    w-full px-3 py-3
    bg-dark-bg-secondary dark:bg-vintage-bg-input
    border border-dark-border-default dark:border-vintage-border-default
    rounded-lg
    text-dark-text-primary dark:text-vintage-text-primary
    placeholder:text-dark-text-tertiary dark:placeholder:text-vintage-text-muted
    focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-vintage-primary focus:border-transparent
    transition-all
  `,
  // Label (swapped)
  label: 'block text-sm font-semibold text-dark-text-secondary dark:text-vintage-text-secondary mb-1',
  // Error text (swapped)
  error: 'text-red-400 dark:text-red-600 text-xs mt-1',
  // Hint text (swapped)
  hint: 'text-dark-text-tertiary dark:text-vintage-text-muted text-xs mt-1',
} as const;

// =============================================================================
// ICON SIZES
// =============================================================================

export const iconSizes = {
  sm: 'text-lg sm:text-xl',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl',
  xl: 'text-3xl sm:text-4xl',
  xxl: 'text-4xl sm:text-5xl',
} as const;

// =============================================================================
// LOADING STATES
// =============================================================================

export const loadingStates = {
  // Full page loading (swapped)
  fullPage: `
    min-h-screen flex items-center justify-center
    bg-dark-bg-primary dark:bg-vintage-bg-page
    transition-colors duration-200
  `,
  // Spinner (swapped)
  spinner: 'animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 dark:border-vintage-primary',
  // Loading text (swapped)
  text: 'mt-4 text-dark-text-secondary dark:text-vintage-text-secondary font-medium',
} as const;
