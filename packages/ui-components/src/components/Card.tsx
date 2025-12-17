import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  /**
   * Card padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'responsive';
  /**
   * Border radius - 'lg' for 36px radius (menu cards), 'default' for 16px
   */
  radius?: 'default' | 'lg';
  className?: string;
  onClick?: () => void;
  /**
   * Accessible label for interactive cards
   */
  'aria-label'?: string;
}

/**
 * Accessible Card Component with WCAG 2.1 AA compliance
 *
 * Features:
 * - Multiple variants (primary, secondary, elevated)
 * - Interactive mode with proper keyboard and focus support
 * - Configurable padding and border radius
 * - Large radius option (36px) for menu cards
 * - High contrast focus ring for keyboard navigation
 *
 * @example
 * ```tsx
 * <Card variant="primary" interactive padding="lg" radius="lg">
 *   <h2>Card Title</h2>
 *   <p>Card content goes here...</p>
 * </Card>
 * ```
 */
export function Card({
  children,
  variant = 'primary',
  interactive = false,
  padding = 'lg',
  radius = 'default',
  className = '',
  onClick,
  'aria-label': ariaLabel,
}: CardProps) {
  // High contrast focus ring for keyboard navigation
  const focusClasses = interactive
    ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring focus-visible:ring-offset-2'
    : '';

  // Theme: Semantic theme tokens (auto-switch via data-theme)
  const variantClasses = {
    primary: `
      bg-theme-bg-card
      border border-theme-border-subtle
      shadow-theme-md
      ${interactive ? 'hover:shadow-theme-lg hover:border-theme-primary cursor-pointer' : ''}
      ${focusClasses}
    `.trim().replace(/\s+/g, ' '),
    secondary: `
      bg-theme-bg-card
      border border-theme-border-default
      shadow-theme-sm
      ${interactive ? 'hover:shadow-theme-md hover:border-theme-border-strong cursor-pointer' : ''}
      ${focusClasses}
    `.trim().replace(/\s+/g, ' '),
    elevated: `
      bg-theme-bg-elevated
      border border-theme-border-subtle
      shadow-theme-lg
      ${interactive ? 'hover:shadow-theme-xl hover:border-theme-primary cursor-pointer' : ''}
      ${focusClasses}
    `.trim().replace(/\s+/g, ' '),
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    responsive: 'p-4 sm:p-6 lg:p-8', // Mobile-first responsive padding
  };

  // 36px radius for large menu cards, 16px for default
  const radiusClasses = {
    default: 'rounded-2xl',
    lg: 'rounded-[36px]',
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${radiusClasses[radius]}
        transition-all duration-200
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
