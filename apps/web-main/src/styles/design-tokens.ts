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
 *
 * Theme System:
 * - Uses semantic `theme-*` tokens that auto-switch based on data-theme attribute
 * - No need for `dark:` variants - handled automatically by CSS variables
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
 * Color tokens - Semantic theme tokens
 * Uses theme-* classes that auto-switch based on data-theme attribute
 * No dark: variants needed - handled by CSS variables
 */
export const colors = {
  // Backgrounds
  bg: {
    page: 'bg-theme-bg-page',
    card: 'bg-theme-bg-card',
    cardWhite: 'bg-theme-bg-card',
    elevated: 'bg-theme-bg-elevated',
    input: 'bg-theme-bg-input',
    hover: 'bg-theme-bg-hover',
  },
  // Text colors
  text: {
    primary: 'text-theme-text-primary',
    secondary: 'text-theme-text-secondary',
    tertiary: 'text-theme-text-tertiary',
    muted: 'text-theme-text-muted',
    accent: 'text-theme-text-accent',
    link: 'text-theme-primary',
    linkHover: 'hover:text-theme-primary-light',
  },
  // Borders
  border: {
    subtle: 'border-theme-border-subtle',
    default: 'border-theme-border-default',
    strong: 'border-theme-border-strong',
  },
  // Accent colors
  accent: {
    primary: 'text-theme-accent',
    light: 'text-theme-accent-light',
    bg: 'bg-theme-accent/20',
  },
  // Status colors (using theme tokens)
  status: {
    success: 'bg-theme-status-success-bg text-theme-status-success-text',
    error: 'bg-theme-status-error-bg text-theme-status-error-text',
    warning: 'bg-theme-status-warning-bg text-theme-status-warning-text',
    info: 'bg-theme-status-info-bg text-theme-status-info-text',
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: 'shadow-theme-sm',
  md: 'shadow-theme-md',
  lg: 'shadow-theme-lg',
  xl: 'shadow-theme-xl',
  '2xl': 'shadow-theme-2xl',
  inner: 'shadow-theme-inner',
  glow: 'shadow-theme-glow',
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
 * Theme: Semantic theme tokens
 */
export const pageLayout = {
  // Full page background
  wrapper: 'min-h-screen bg-theme-bg-page transition-colors duration-200',
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
 * Theme: Semantic theme tokens
 */
export const cardStyles = {
  // Primary card
  primary: `
    bg-theme-bg-card
    border border-theme-border-subtle
    rounded-2xl shadow-theme-md
    transition-colors duration-200
  `,
  // Primary card hover
  primaryHover: `
    hover:shadow-theme-lg
    hover:border-theme-border-default
  `,
  // Secondary card
  secondary: `
    bg-theme-bg-card
    border border-theme-border-default
    rounded-2xl shadow-theme-sm
    transition-colors duration-200
  `,
  // Elevated card
  elevated: `
    bg-theme-bg-elevated
    border border-theme-border-subtle
    rounded-2xl shadow-theme-lg
    transition-colors duration-200
  `,
} as const;

// =============================================================================
// BUTTON PATTERNS
// =============================================================================

/**
 * Button base styles (use with UI components when possible)
 * Theme: Semantic theme tokens
 */
export const buttonStyles = {
  // Primary gradient button
  primary: `
    bg-gradient-to-r from-theme-primary-dark to-theme-primary
    hover:from-theme-primary hover:to-theme-primary-light
    text-white
    font-semibold rounded-lg
    shadow-lg shadow-theme-primary/30
    transform hover:scale-[1.02] active:scale-[0.98]
    transition-all
  `,
  // Secondary button
  secondary: `
    bg-theme-bg-elevated
    hover:bg-theme-bg-hover
    text-theme-text-primary
    border border-theme-border-default
    font-semibold rounded-lg
    transition-all
  `,
  // Destructive button
  destructive: `
    bg-theme-status-error-bg
    hover:opacity-80
    text-theme-status-error-text
    border border-theme-status-error-border
    font-semibold rounded-lg
    transition-all
  `,
  // Accent button
  accent: `
    bg-theme-accent
    hover:bg-theme-accent-light
    text-white
    font-semibold rounded-lg
    shadow-lg shadow-theme-accent/30
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
  fixedBottom: 'fixed bottom-0 left-0 right-0 z-50 bg-theme-bg-card border-t border-theme-border-default p-3',
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
    bg-theme-bg-input
    border border-theme-border-default
    rounded-lg
    text-theme-text-primary
    placeholder:text-theme-text-muted
    focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent
    transition-all
  `,
  // Label
  label: 'block text-sm font-semibold text-theme-text-secondary mb-1',
  // Error text
  error: 'text-theme-status-error-text text-xs mt-1',
  // Hint text
  hint: 'text-theme-text-muted text-xs mt-1',
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
    bg-theme-bg-page
    transition-colors duration-200
  `,
  // Spinner
  spinner: 'animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary',
  // Loading text
  text: 'mt-4 text-theme-text-secondary font-medium',
} as const;
