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
export default function Card({
  children,
  variant = 'primary',
  interactive = false,
  padding = 'lg',
  className = '',
  onClick,
}: CardProps) {
  // Theme: Vintage Natural Wood Library
  const variantClasses = {
    primary: `
      bg-vintage-bg-card dark:bg-dark-bg-card
      border border-vintage-border-subtle dark:border-dark-border-subtle
      shadow-vintage-md dark:shadow-dark-md
      ${
        interactive
          ? 'hover:shadow-vintage-lg dark:hover:shadow-dark-lg hover:border-vintage-border-default dark:hover:border-amber-500/30 cursor-pointer'
          : ''
      }
    `,
    secondary: `
      bg-white dark:bg-dark-bg-card
      border border-vintage-border-default dark:border-dark-border-default
      shadow-vintage-sm dark:shadow-dark-sm
      ${
        interactive
          ? 'hover:shadow-vintage-md dark:hover:shadow-dark-md hover:border-vintage-border-strong dark:hover:border-dark-border-subtle cursor-pointer'
          : ''
      }
    `,
    elevated: `
      bg-white dark:bg-dark-bg-card
      border border-vintage-border-subtle dark:border-dark-border-subtle
      shadow-vintage-lg dark:shadow-dark-lg
      ${
        interactive
          ? 'hover:shadow-xl dark:hover:shadow-dark-xl hover:border-vintage-border-default dark:hover:border-dark-border-default cursor-pointer'
          : ''
      }
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
        transition-all duration-200
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
