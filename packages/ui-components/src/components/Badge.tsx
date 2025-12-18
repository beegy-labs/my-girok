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
  size?: 'sm' | 'md';
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Static variant classes
const variantClasses = {
  default: 'bg-theme-bg-hover text-theme-text-secondary border-theme-border-default',
  success:
    'bg-theme-status-success-bg text-theme-status-success-text border-theme-status-success-border',
  warning:
    'bg-theme-status-warning-bg text-theme-status-warning-text border-theme-status-warning-border',
  error: 'bg-theme-status-error-bg text-theme-status-error-text border-theme-status-error-border',
  info: 'bg-theme-status-info-bg text-theme-status-info-text border-theme-status-info-border',
  accent: 'bg-theme-accent-pale text-theme-primary border-theme-primary',
} as const;

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
} as const;

/**
 * Badge Component for status indicators and labels
 *
 * Features:
 * - Multiple color variants (default, success, warning, error, info, accent)
 * - Size options (sm, md)
 * - WCAG AAA compliant text contrast
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm">Pending</Badge>
 * ```
 */
export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
 *
 * Features:
 * - Uppercase text with wide letter-spacing
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
      className={`inline-flex items-center px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-theme-text-muted bg-theme-bg-card border border-theme-border-default rounded-full ${className}`}
      style={{ fontFamily: 'var(--font-family-mono-brand)' }}
    >
      {children}
    </span>
  );
}
