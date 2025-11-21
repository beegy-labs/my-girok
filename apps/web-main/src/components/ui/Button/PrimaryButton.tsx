import React from 'react';

export interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * PrimaryButton Component
 *
 * A gradient amber button with hover animations and loading state support.
 * This is the primary call-to-action button used throughout the application.
 *
 * Features:
 * - Gradient amber styling with dark mode support
 * - Hover scale animation
 * - Loading spinner state
 * - Size variants (sm, md, lg)
 * - Full width option
 * - Disabled state handling
 *
 * @example
 * ```tsx
 * <PrimaryButton
 *   onClick={handleSubmit}
 *   loading={isSubmitting}
 *   disabled={!isValid}
 * >
 *   Save Resume
 * </PrimaryButton>
 * ```
 */
export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
  className = '',
}: PrimaryButtonProps) {
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4',
    lg: 'py-4 px-6 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${sizeClasses[size]}
        bg-gradient-to-r from-amber-700 to-amber-600
        dark:from-amber-400 dark:to-amber-500
        hover:from-amber-800 hover:to-amber-700
        dark:hover:from-amber-300 dark:hover:to-amber-400
        text-white dark:text-gray-900
        font-semibold
        rounded-lg
        transition-all
        transform hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-gray-900"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
