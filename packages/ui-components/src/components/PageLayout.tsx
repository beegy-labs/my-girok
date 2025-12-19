import React from 'react';

export interface PageLayoutProps {
  /**
   * Page content
   */
  children: React.ReactNode;
  /**
   * Maximum width variant
   */
  maxWidth?: 'md' | 'lg' | 'xl' | '5xl' | 'full';
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Additional CSS classes for the inner content wrapper
   */
  contentClassName?: string;
}

// Max width classes
const maxWidthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
} as const;

/**
 * Page Layout Component for consistent page structure
 *
 * Features:
 * - Centered content with configurable max-width
 * - Responsive horizontal padding
 * - Consistent vertical spacing for nav clearance
 * - Editorial-style max-w-5xl default
 *
 * @example
 * ```tsx
 * <PageLayout maxWidth="5xl">
 *   <h1>Page Title</h1>
 *   <p>Page content...</p>
 * </PageLayout>
 * ```
 */
export function PageLayout({
  children,
  maxWidth = '5xl',
  className = '',
  contentClassName = '',
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-theme-bg-page pt-nav pb-12 ${className}`}>
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClasses[maxWidth]} ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

export interface PageSectionProps {
  /**
   * Section content
   */
  children: React.ReactNode;
  /**
   * Section title (displayed as serif heading)
   */
  title?: string;
  /**
   * Section badge text (displayed above title)
   */
  badge?: string;
  /**
   * Right-side actions (e.g., ViewToggle)
   */
  actions?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Page Section Component for editorial-style content sections
 *
 * Features:
 * - Optional badge and serif title
 * - Action slot for controls (e.g., ViewToggle)
 * - Consistent spacing
 *
 * @example
 * ```tsx
 * <PageSection badge="MY ARCHIVE" title="Personal Journal" actions={<ViewToggle />}>
 *   <div className="grid grid-cols-2 gap-6">...</div>
 * </PageSection>
 * ```
 */
export function PageSection({ children, title, badge, actions, className = '' }: PageSectionProps) {
  return (
    <section className={`py-8 ${className}`}>
      {(badge || title || actions) && (
        <div className="flex items-center justify-between mb-8">
          <div>
            {badge && (
              <span className="inline-flex items-center px-3 py-1 mb-3 text-xs font-medium uppercase tracking-brand-sm text-theme-text-muted bg-theme-bg-card border border-theme-border-default rounded-full font-mono-brand">
                {badge}
              </span>
            )}
            {title && (
              <h2 className="text-2xl sm:text-3xl text-theme-text-primary tracking-tight font-serif-title">
                {title}
              </h2>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
