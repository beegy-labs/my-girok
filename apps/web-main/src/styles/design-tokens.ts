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
 * Color tokens - 주간/야간 통합 관리
 * Theme: "Wood Library" - 원목 도서관
 * base 색상 참조로 주간/야간 동일
 */
export const colors = {
  // Backgrounds
  bg: {
    page: 'bg-vintage-bg-page dark:bg-dark-bg-primary',
    card: 'bg-vintage-bg-card dark:bg-dark-bg-card',
    cardWhite: 'bg-vintage-bg-card dark:bg-dark-bg-card',
    elevated: 'bg-vintage-bg-elevated dark:bg-dark-bg-elevated',
    input: 'bg-vintage-bg-input dark:bg-dark-bg-secondary',
    hover: 'bg-vintage-bg-hover dark:bg-dark-bg-hover',
  },
  // Text colors
  text: {
    primary: 'text-vintage-text-primary dark:text-dark-text-primary',
    secondary: 'text-vintage-text-secondary dark:text-dark-text-secondary',
    tertiary: 'text-vintage-text-tertiary dark:text-dark-text-tertiary',
    muted: 'text-vintage-text-muted dark:text-dark-text-disabled',
    accent: 'text-vintage-text-accent dark:text-dark-border-accent',
    link: 'text-vintage-primary dark:text-vintage-primary',
    linkHover: 'hover:text-vintage-primary-light dark:hover:text-vintage-primary-light',
  },
  // Borders
  border: {
    subtle: 'border-vintage-border-subtle dark:border-dark-border-subtle',
    default: 'border-vintage-border-default dark:border-dark-border-default',
    strong: 'border-vintage-border-strong dark:border-dark-border-strong',
  },
  // Accent colors (버건디)
  accent: {
    primary: 'text-vintage-accent dark:text-vintage-accent',
    light: 'text-vintage-accent-light dark:text-vintage-accent-light',
    bg: 'bg-vintage-accent/20 dark:bg-vintage-accent/20',
  },
  // Status colors
  status: {
    success: 'bg-green-900/30 text-green-300',
    error: 'bg-red-900/20 text-red-400',
    warning: 'bg-yellow-900/20 text-yellow-400',
    info: 'bg-blue-900/20 text-blue-400',
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: 'shadow-vintage-sm dark:shadow-dark-sm',
  md: 'shadow-vintage-md dark:shadow-dark-md',
  lg: 'shadow-vintage-lg dark:shadow-dark-lg',
  xl: 'shadow-vintage-lg dark:shadow-dark-lg',
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
  // Full page background (warm ivory)
  wrapper: 'min-h-screen bg-vintage-bg-page dark:bg-dark-bg-primary transition-colors duration-200',
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
  // Primary card
  primary: `
    bg-vintage-bg-card dark:bg-dark-bg-card
    border border-vintage-border-subtle dark:border-dark-border-subtle
    rounded-2xl shadow-vintage-md dark:shadow-dark-md
    transition-colors duration-200
  `,
  // Primary card hover
  primaryHover: `
    hover:shadow-vintage-lg dark:hover:shadow-dark-lg
    hover:border-vintage-border-default dark:hover:border-dark-border-default
  `,
  // Secondary card
  secondary: `
    bg-vintage-bg-card dark:bg-dark-bg-card
    border border-vintage-border-default dark:border-dark-border-default
    rounded-2xl shadow-vintage-sm dark:shadow-dark-sm
    transition-colors duration-200
  `,
  // Elevated card
  elevated: `
    bg-vintage-bg-elevated dark:bg-dark-bg-elevated
    border border-vintage-border-subtle dark:border-dark-border-subtle
    rounded-2xl shadow-vintage-lg dark:shadow-dark-lg
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
  // Primary gradient button
  primary: `
    bg-gradient-to-r from-vintage-primary-dark to-vintage-primary
    dark:from-vintage-primary-dark dark:to-vintage-primary
    hover:from-vintage-primary hover:to-vintage-primary-light
    dark:hover:from-vintage-primary dark:hover:to-vintage-primary-light
    text-white dark:text-white
    font-semibold rounded-lg
    shadow-lg shadow-vintage-primary/30 dark:shadow-vintage-primary/30
    transform hover:scale-[1.02] active:scale-[0.98]
    transition-all
  `,
  // Secondary button
  secondary: `
    bg-vintage-bg-elevated dark:bg-dark-bg-elevated
    hover:bg-vintage-bg-hover dark:hover:bg-dark-bg-hover
    text-vintage-text-primary dark:text-dark-text-primary
    border border-vintage-border-default dark:border-dark-border-default
    font-semibold rounded-lg
    transition-all
  `,
  // Destructive button
  destructive: `
    bg-red-900/20 dark:bg-red-900/20
    hover:bg-red-900/30 dark:hover:bg-red-900/30
    text-red-400 dark:text-red-400
    border border-red-800 dark:border-red-800
    font-semibold rounded-lg
    transition-all
  `,
  // Accent button (버건디)
  accent: `
    bg-vintage-accent dark:bg-vintage-accent
    hover:bg-vintage-accent-light dark:hover:bg-vintage-accent-light
    text-white dark:text-white
    font-semibold rounded-lg
    shadow-lg shadow-vintage-accent/30 dark:shadow-vintage-accent/30
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
  // Fixed bottom bar
  fixedBottom: 'fixed bottom-0 left-0 right-0 z-50 bg-vintage-bg-card dark:bg-dark-bg-card border-t border-vintage-border-default dark:border-dark-border-default p-3',
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
  // Input base
  input: `
    w-full px-3 py-3
    bg-vintage-bg-input dark:bg-dark-bg-secondary
    border border-vintage-border-default dark:border-dark-border-default
    rounded-lg
    text-vintage-text-primary dark:text-dark-text-primary
    placeholder:text-vintage-text-muted dark:placeholder:text-dark-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-vintage-primary dark:focus:ring-vintage-primary focus:border-transparent
    transition-all
  `,
  // Label
  label: 'block text-sm font-semibold text-vintage-text-secondary dark:text-dark-text-secondary mb-1',
  // Error text
  error: 'text-red-400 dark:text-red-400 text-xs mt-1',
  // Hint text
  hint: 'text-vintage-text-muted dark:text-dark-text-tertiary text-xs mt-1',
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
  // Full page loading
  fullPage: `
    min-h-screen flex items-center justify-center
    bg-vintage-bg-page dark:bg-dark-bg-primary
    transition-colors duration-200
  `,
  // Spinner
  spinner: 'animate-spin rounded-full h-12 w-12 border-b-2 border-vintage-primary dark:border-vintage-primary',
  // Loading text
  text: 'mt-4 text-vintage-text-secondary dark:text-dark-text-secondary font-medium',
} as const;
