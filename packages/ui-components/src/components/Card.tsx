import React, { memo } from 'react';
import { focusClasses } from '../styles/constants';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  /**
   * Card padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  /**
   * Border radius - multiple options for V0.0.1 editorial design
   */
  radius?: 'none' | 'subtle' | 'default' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
  /**
   * Accessible label for interactive cards
   */
  'aria-label'?: string;
}

// Static class definitions (defined outside component for performance)
// V0.0.1 AAA Workstation Design System

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

// V0.0.1 Radius options - SSOT tokens from tokens.css
// Unified radius policy - all use rounded-soft (8px)
const radiusClasses = {
  none: 'rounded-none', // 0px - Sharp corners
  subtle: 'rounded-subtle', // SSOT: 4px - Minimal rounding
  default: 'rounded-soft', // SSOT: 8px - Soft corners (default)
  md: 'rounded-soft', // SSOT: 8px - unified (was 24px)
  lg: 'rounded-soft', // SSOT: 8px - unified (was 32px)
  xl: 'rounded-soft', // SSOT: 8px - unified (was 40px)
  '2xl': 'rounded-soft', // SSOT: 8px - unified (was 48px)
} as const;

/**
 * Accessible Card Component with WCAG 2.1 AAA compliance
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Multiple variants (primary, secondary, elevated)
 * - Interactive mode with proper keyboard and focus support
 * - Configurable padding and border radius
 * - Unified rounded-soft (8px) for all radius options
 * - High contrast focus ring for keyboard navigation
 * - border-2 for modern aesthetic
 * - Memoized to prevent unnecessary re-renders (rules.md:275)
 *
 * @example
 * ```tsx
 * <Card variant="primary" interactive padding="xl" radius="2xl">
 *   <h2>Card Title</h2>
 *   <p>Card content goes here...</p>
 * </Card>
 * ```
 */
export const Card = memo(function Card({
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
});
