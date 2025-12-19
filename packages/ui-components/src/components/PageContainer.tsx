import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  /**
   * Maximum width of the content
   * - sm: max-w-md (auth pages)
   * - md: max-w-2xl
   * - lg: max-w-4xl (settings)
   * - xl: max-w-6xl (dashboard)
   * - full: max-w-7xl (home)
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * Page padding style
   * - default: standard padding with responsive scaling
   * - none: no padding
   * - compact: minimal padding for dense layouts
   */
  padding?: 'default' | 'none' | 'compact';
  /**
   * Center content vertically (for auth pages)
   */
  centered?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-7xl',
} as const;

const paddingClasses = {
  default: 'px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
  none: '',
  compact: 'px-2 py-4 sm:px-4 sm:py-6',
} as const;

/**
 * PageContainer Component
 *
 * Provides consistent page layout wrapper with responsive background,
 * container width, and padding across all pages.
 *
 * Features:
 * - Full-screen dark mode aware background
 * - Responsive container widths
 * - Optional vertical centering
 * - Consistent padding across breakpoints
 *
 * @example
 * ```tsx
 * // Dashboard page
 * <PageContainer maxWidth="xl">
 *   <PageHeader icon="..." title="Dashboard" />
 *   <YourContent />
 * </PageContainer>
 *
 * // Auth page (centered)
 * <PageContainer maxWidth="sm" centered>
 *   <LoginForm />
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  maxWidth = 'xl',
  padding = 'default',
  centered = false,
  className = '',
}: PageContainerProps) {
  if (centered) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4 bg-theme-bg-page transition-colors duration-200 pt-nav">
        <div className={`${maxWidthClasses[maxWidth]} w-full ${className}`}>{children}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-theme-bg-page transition-colors duration-200 pt-nav">
      <div
        className={`
          ${maxWidthClasses[maxWidth]} mx-auto
          ${paddingClasses[padding]}
          ${className}
        `}
      >
        {children}
      </div>
    </main>
  );
}
