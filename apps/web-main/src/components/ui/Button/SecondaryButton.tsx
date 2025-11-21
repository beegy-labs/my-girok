export interface SecondaryButtonProps {
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
 * SecondaryButton Component
 *
 * A secondary action button with gray styling.
 * Used for less prominent actions like "Cancel" or "Back".
 *
 * Features:
 * - Gray styling with border
 * - Hover effects
 * - Loading spinner state
 * - Size variants (sm, md, lg)
 * - Full width option
 * - Disabled state handling
 *
 * @example
 * ```tsx
 * <SecondaryButton onClick={handleCancel}>
 *   Cancel
 * </SecondaryButton>
 * ```
 */
export default function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
  className = '',
}: SecondaryButtonProps) {
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
        bg-gray-100 dark:bg-dark-bg-elevated
        hover:bg-gray-200 dark:hover:bg-dark-bg-hover
        text-gray-700 dark:text-dark-text-primary
        font-semibold
        rounded-lg
        border border-gray-300 dark:border-dark-border-default
        transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
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
