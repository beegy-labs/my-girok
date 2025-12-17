import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /**
   * Button variant for different styles
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Shows loading state with spinner
   */
  loading?: boolean;
  /**
   * Makes button full width
   */
  fullWidth?: boolean;
  /**
   * Icon to display before the button text
   */
  icon?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable button component with consistent styling and loading states
 *
 * @example
 * ```tsx
 * <Button
 *   variant="primary"
 *   loading={isSubmitting}
 *   onClick={handleSubmit}
 * >
 *   Submit
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    icon,
    className = '',
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = 'font-semibold rounded-lg transition transform focus:outline-none focus:ring-2 focus:ring-opacity-50';

    const variantClasses = {
      primary:
        'bg-gradient-to-r from-btn-primary-from to-btn-primary-to text-btn-primary-text shadow-lg shadow-theme-primary/30 focus:ring-theme-primary hover:scale-[1.02] active:scale-[0.98]',
      secondary:
        'bg-btn-secondary-bg border border-btn-secondary-border text-btn-secondary-text hover:bg-btn-secondary-bg-hover focus:ring-theme-primary hover:scale-[1.01] active:scale-[0.99]',
      danger:
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800',
      ghost:
        'text-theme-text-primary hover:bg-theme-bg-elevated focus:ring-theme-primary dark:text-theme-text-primary dark:hover:bg-theme-bg-hover',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-4 py-3',
    };

    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
    const widthClass = fullWidth ? 'w-full' : '';

    const LoadingSpinner = () => (
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
    );

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${disabledClasses}
          ${widthClass}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        <span className="flex items-center justify-center">
          {loading && <LoadingSpinner />}
          {!loading && icon && <span className="mr-2">{icon}</span>}
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
