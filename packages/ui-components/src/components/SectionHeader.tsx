import React from 'react';

export interface SectionHeaderProps {
  /**
   * Section title
   */
  title: string;
  /**
   * Optional emoji icon
   */
  icon?: string;
  /**
   * Optional right-side action element
   */
  action?: React.ReactNode;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * SectionHeader Component
 *
 * Consistent section title styling with optional icon and action.
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   icon="..."
 *   title="Resume List"
 *   action={<button>View All</button>}
 * />
 * ```
 */
export function SectionHeader({
  title,
  icon,
  action,
  size = 'md',
  className = '',
}: SectionHeaderProps) {
  const sizeClasses = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  return (
    <div className={`flex items-center justify-between mb-3 sm:mb-4 ${className}`}>
      <h2 className={`${sizeClasses[size]} font-bold text-theme-text-primary flex items-center gap-2`}>
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {action && <div>{action}</div>}
    </div>
  );
}
