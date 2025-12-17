import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'responsive';
  className?: string;
  onClick?: () => void;
}

/**
 * Card Component
 *
 * A versatile card container with multiple variants and configurations.
 * Used throughout the application for grouping related content.
 *
 * Features:
 * - Multiple variants (primary with amber tones, secondary with gray, elevated with stronger shadow)
 * - Interactive mode for clickable cards (adds hover effects)
 * - Configurable padding
 * - Dark mode support
 * - Optional click handler
 *
 * @example
 * ```tsx
 * <Card variant="primary" interactive padding="lg">
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
  className = '',
  onClick,
}: CardProps) {
  // Focus indicator for interactive cards (keyboard navigation)
  const focusClasses = interactive
    ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg-primary'
    : '';

  // Theme: Semantic theme tokens (auto-switch via data-theme)
  const variantClasses = {
    primary: `
      bg-theme-bg-card
      border border-theme-border-subtle
      shadow-theme-md
      ${interactive ? 'hover:shadow-theme-lg hover:border-theme-border-default cursor-pointer' : ''}
      ${focusClasses}
    `,
    secondary: `
      bg-theme-bg-card
      border border-theme-border-default
      shadow-theme-sm
      ${interactive ? 'hover:shadow-theme-md hover:border-theme-border-strong cursor-pointer' : ''}
      ${focusClasses}
    `,
    elevated: `
      bg-theme-bg-elevated
      border border-theme-border-subtle
      shadow-theme-lg
      ${interactive ? 'hover:shadow-theme-xl hover:border-theme-border-default cursor-pointer' : ''}
      ${focusClasses}
    `,
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    responsive: 'p-3 sm:p-4 lg:p-6', // Mobile-first responsive padding
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        rounded-2xl
        transition duration-200
        ${className}
      `}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
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
