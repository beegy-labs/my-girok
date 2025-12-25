// apps/web-admin/src/components/atoms/Card.tsx
import { memo, ReactNode, HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(
    ({ children, padding = 'md', className = '', ...props }, ref) => (
      <div
        ref={ref}
        className={`bg-theme-bg-card border border-theme-border-default rounded-xl ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    ),
  ),
);

Card.displayName = 'Card';
