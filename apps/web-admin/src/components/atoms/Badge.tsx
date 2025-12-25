// apps/web-admin/src/components/atoms/Badge.tsx
import { memo, ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-theme-bg-secondary text-theme-text-primary',
  success: 'bg-theme-status-success-bg text-theme-status-success-text',
  warning: 'bg-theme-status-warning-bg text-theme-status-warning-text',
  error: 'bg-theme-status-error-bg text-theme-status-error-text',
  info: 'bg-theme-status-info-bg text-theme-status-info-text',
};

export const Badge = memo<BadgeProps>(({ variant = 'default', children, className = '' }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${variantStyles[variant]} ${className}`}>
    {children}
  </span>
));

Badge.displayName = 'Badge';
