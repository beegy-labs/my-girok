import React from 'react';
import { Link } from 'react-router';

export interface PageHeaderProps {
  /**
   * Page title
   */
  title: string;
  /**
   * Optional subtitle/description
   */
  subtitle?: string;
  /**
   * Optional emoji icon
   */
  icon?: string;
  /**
   * Back link URL (shows back button if provided)
   */
  backLink?: string;
  /**
   * Back button text (default: "< Back")
   */
  backText?: string;
  /**
   * Right-side action button/element
   */
  action?: React.ReactNode;
  /**
   * Size variant
   * - lg: Large header (main pages like Home, My Resume)
   * - md: Medium header (standard pages)
   * - sm: Small header (modal headers, sub-sections)
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * PageHeader Component
 *
 * Consistent header pattern for all pages with responsive sizing
 * and optional back navigation.
 *
 * Features:
 * - Responsive typography
 * - Optional icon support
 * - Back navigation link
 * - Right-side action slot
 * - Dark mode support
 * - Amber card styling
 *
 * @example
 * ```tsx
 * // Main page header
 * <PageHeader
 *   icon="..."
 *   title="My Resumes"
 *   subtitle="Manage your professional resumes"
 *   action={<PrimaryButton>Create New</PrimaryButton>}
 * />
 *
 * // Page with back navigation
 * <PageHeader
 *   backLink="/"
 *   backText="Back to Home"
 *   title="Settings"
 * />
 * ```
 */
export default function PageHeader({
  title,
  subtitle,
  icon,
  backLink,
  backText = '< Back',
  action,
  size = 'lg',
  className = '',
}: PageHeaderProps) {
  const sizeClasses = {
    sm: {
      wrapper: 'p-3 sm:p-4 mb-3 sm:mb-4',
      iconSize: 'text-xl sm:text-2xl',
      titleSize: 'text-lg sm:text-xl font-bold',
      subtitleSize: 'text-xs sm:text-sm',
      gap: 'gap-2',
    },
    md: {
      wrapper: 'p-4 sm:p-6 mb-4 sm:mb-6',
      iconSize: 'text-2xl sm:text-3xl',
      titleSize: 'text-xl sm:text-2xl font-bold',
      subtitleSize: 'text-sm sm:text-base',
      gap: 'gap-2 sm:gap-3',
    },
    lg: {
      wrapper: 'p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6',
      iconSize: 'text-2xl sm:text-3xl',
      titleSize: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
      subtitleSize: 'text-sm sm:text-base',
      gap: 'gap-2 sm:gap-3',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={`
        bg-vintage-bg-card dark:bg-dark-bg-card
        border border-vintage-border-subtle dark:border-dark-border-subtle
        rounded-xl sm:rounded-2xl
        shadow-lg dark:shadow-dark-lg
        ${styles.wrapper}
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Back Link */}
      {backLink && (
        <Link
          to={backLink}
          className="inline-flex items-center text-vintage-primary dark:text-vintage-primary hover:text-vintage-primary-light dark:hover:text-vintage-primary-light mb-3 sm:mb-4 text-sm sm:text-base transition-colors"
        >
          {backText}
        </Link>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className={`flex items-center ${styles.gap} mb-1 sm:mb-2`}>
            {icon && <span className={styles.iconSize}>{icon}</span>}
            <h1 className={`${styles.titleSize} text-vintage-text-primary dark:text-dark-text-primary break-words`}>
              {title}
            </h1>
          </div>
          {subtitle && (
            <p
              className={`
                ${styles.subtitleSize}
                text-vintage-text-secondary dark:text-dark-text-secondary
                ${icon ? 'ml-8 sm:ml-10 lg:ml-12' : ''}
              `}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Slot */}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
