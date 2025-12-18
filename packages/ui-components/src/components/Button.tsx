import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /**
   * Button variant for different styles
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /**
   * Button size - all sizes meet WCAG 44x44px minimum touch target
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
  /**
   * Ref for the button element (React 19 style - ref as prop)
   */
  ref?: Ref<HTMLButtonElement>;
}

// Static class definitions (defined outside component for performance)
// tracking-wide improves readability for long button text (WCAG AAA)
const baseClasses =
  'font-semibold tracking-wide rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-theme-focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

const variantClasses = {
  primary:
    'bg-gradient-to-r from-btn-primary-from to-btn-primary-to text-btn-primary-text shadow-theme-md hover:shadow-theme-lg hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-btn-secondary-bg border border-btn-secondary-border text-btn-secondary-text hover:bg-btn-secondary-bg-hover hover:scale-[1.01] active:scale-[0.99]',
  danger: 'bg-btn-danger-bg text-btn-danger-text hover:bg-btn-danger-bg-hover active:scale-[0.98]',
  ghost: 'text-theme-text-primary bg-transparent hover:bg-theme-bg-hover',
} as const;

// All sizes meet WCAG 44x44px minimum touch target
const sizeClasses = {
  sm: 'min-h-[44px] px-4 py-2.5 text-sm',
  md: 'min-h-[44px] px-5 py-3 text-base',
  lg: 'min-h-[48px] px-6 py-3.5 text-lg',
} as const;

/**
 * Accessible button component with WCAG 2.1 AA compliance
 *
 * Features:
 * - Minimum 44x44px touch target (WCAG 2.5.5)
 * - High contrast focus ring for keyboard navigation
 * - Proper disabled states
 * - Loading state with spinner
 * - React 19 compatible (ref as prop)
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
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className = '',
  children,
  disabled,
  ref,
  ...props
}: ButtonProps) {
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {loading && <LoadingSpinner />}
        {!loading && icon && <span aria-hidden="true">{icon}</span>}
        {children}
      </span>
    </button>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-2 h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
