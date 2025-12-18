import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  /**
   * Card padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  /**
   * Border radius - multiple options for V25.8 editorial design
   */
  radius?: 'default' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
  /**
   * Accessible label for interactive cards
   */
  'aria-label'?: string;
}

// Static class definitions (defined outside component for performance)
// V25.8 AAA Workstation Design System
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

const variantBaseClasses = {
  primary: 'bg-theme-bg-card border-2 border-theme-border-subtle shadow-theme-sm',
  secondary: 'bg-theme-bg-card border-2 border-theme-border-default shadow-theme-sm',
  elevated: 'bg-theme-bg-elevated border-2 border-theme-border-subtle shadow-theme-lg',
} as const;

const variantInteractiveClasses = {
  primary: 'hover:shadow-theme-lg hover:border-theme-primary cursor-pointer',
  secondary: 'hover:shadow-theme-md hover:border-theme-border-strong cursor-pointer',
  elevated: 'hover:shadow-theme-xl hover:border-theme-primary cursor-pointer',
} as const;

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10 md:p-14',
  responsive: 'p-4 sm:p-6 lg:p-8', // Mobile-first responsive padding
} as const;

// V25.8 Editorial radius options
const radiusClasses = {
  default: 'rounded-2xl', // 16px
  lg: 'rounded-[40px]', // 40px - editorial standard
  xl: 'rounded-[48px]', // 48px - widget/featured cards
  '2xl': 'rounded-[64px]', // 64px - hero sections
} as const;

/**
 * Accessible Card Component with WCAG 2.1 AAA compliance
 * V25.8 AAA Workstation Design System
 *
 * Features:
 * - Multiple variants (primary, secondary, elevated)
 * - Interactive mode with proper keyboard and focus support
 * - Configurable padding and border radius
 * - Editorial radius options (40px, 48px, 64px) for V25.8 design
 * - High contrast focus ring for keyboard navigation
 * - border-2 for modern aesthetic
 *
 * @example
 * ```tsx
 * <Card variant="primary" interactive padding="xl" radius="2xl">
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
  const variantClass = variantBaseClasses[variant];
  const interactiveClass = interactive
    ? `${variantInteractiveClasses[variant]} ${focusClasses}`
    : '';
  const paddingClass = paddingClasses[padding];
  const radiusClass = radiusClasses[radius];

  return (
    <div
      onClick={onClick}
      className={`${variantClass} ${interactiveClass} ${paddingClass} ${radiusClass} transition-all duration-200 ${className}`}
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
