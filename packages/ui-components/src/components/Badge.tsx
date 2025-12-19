import React from 'react';

export interface BadgeProps {
  /**
   * Badge content
   */
  children: React.ReactNode;
  /**
   * Badge variant
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Border radius style
   */
  rounded?: 'default' | 'full';
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Static variant classes
// V0.0.1 AAA Workstation Design System
const variantClasses = {
  default: 'bg-theme-bg-secondary text-theme-text-secondary border-theme-border-default',
  success:
    'bg-theme-status-success-bg text-theme-status-success-text border-theme-status-success-border',
  warning:
    'bg-theme-status-warning-bg text-theme-status-warning-text border-theme-status-warning-border',
  error: 'bg-theme-status-error-bg text-theme-status-error-text border-theme-status-error-border',
  info: 'bg-theme-status-info-bg text-theme-status-info-text border-theme-status-info-border',
  accent: 'bg-theme-accent-pale text-theme-primary border-theme-primary',
} as const;

const sizeClasses = {
  sm: 'px-3 py-1 text-[11px]',
  md: 'px-4 py-1.5 text-xs',
  lg: 'px-5 py-2 text-[14px]',
} as const;

const roundedClasses = {
  default: 'rounded-lg',
  full: 'rounded-full',
} as const;

/**
 * Badge Component for status indicators and labels
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Multiple color variants (default, success, warning, error, info, accent)
 * - Size options (sm, md, lg)
 * - Rounded options (default: lg, full: pill shape)
 * - WCAG AAA compliant text contrast
 * - Wider tracking for improved readability
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm" rounded="full">Pending</Badge>
 * ```
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-black uppercase border tracking-widest ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
    >
      {children}
    </span>
  );
}

export interface SectionBadgeProps {
  /**
   * Badge text
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Section Badge for editorial-style section headers
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Uppercase text with wide letter-spacing (0.3em)
 * - Monospace font for technical feel
 * - Subtle border and background
 *
 * @example
 * ```tsx
 * <SectionBadge>MY ARCHIVE</SectionBadge>
 * ```
 */
export function SectionBadge({ children, className = '' }: SectionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 text-[11px] font-bold uppercase tracking-brand text-theme-primary bg-theme-bg-secondary border border-theme-border-default rounded-lg font-mono-brand ${className}`}
    >
      {children}
    </span>
  );
}
