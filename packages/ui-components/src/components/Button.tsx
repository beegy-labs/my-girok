import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { focusClasses } from '../styles/constants';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /**
   * Button variant for different styles
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /**
   * Button size - all sizes meet WCAG 44x44px minimum touch target
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Border radius style
   */
  rounded?: 'default' | 'editorial' | 'full';
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
// V0.0.1 AAA Workstation Design System
// tracking-wide improves readability for long button text (WCAG AAA)
// Focus ring via focusClasses (SSOT: 4px ring, 4px offset)
const baseClasses =
  'font-bold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

const variantClasses = {
  primary:
    'bg-gradient-to-r from-btn-primary-from to-btn-primary-to text-btn-primary-text shadow-theme-md hover:shadow-theme-lg hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-btn-secondary-bg border-2 border-btn-secondary-border text-btn-secondary-text hover:bg-btn-secondary-bg-hover hover:scale-[1.01] active:scale-[0.99]',
  danger: 'bg-btn-danger-bg text-btn-danger-text hover:bg-btn-danger-bg-hover active:scale-[0.98]',
  ghost:
    'text-theme-text-primary bg-transparent hover:bg-theme-bg-hover border-2 border-transparent hover:border-theme-border-default',
} as const;

// All sizes meet WCAG 44x44px minimum touch target
// V0.0.1 Editorial sizes: lg (56px) and xl (64px) have editorial typography
// SSOT tracking tokens: tracking-brand (0.3em)
const sizeClasses = {
  sm: 'min-h-[44px] px-4 py-2.5 text-sm',
  md: 'min-h-[44px] px-5 py-3 text-base',
  lg: 'h-14 min-h-[56px] px-6 py-3.5 text-[11px] font-black uppercase tracking-brand',
  xl: 'h-16 min-h-[64px] px-8 py-4 text-[14px] font-black uppercase tracking-brand',
} as const;

// Border radius options - SSOT tokens from tokens.css
// V0.0.1: default (24px) for consistent curves, editorial (24px) same for compatibility
const roundedClasses = {
  default: 'rounded-input', // SSOT: --border-radius-input: 24px
  editorial: 'rounded-input', // SSOT: --border-radius-input: 24px
  full: 'rounded-full',
} as const;

/**
 * Accessible button component with WCAG 2.1 AAA compliance
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Minimum 44x44px touch target (WCAG 2.5.5)
 * - High contrast focus ring for keyboard navigation
 * - Proper disabled states
 * - Loading state with spinner
 * - Editorial radius option (24px) for V0.0.1 styling
 * - React 19 compatible (ref as prop)
 *
 * @example
 * ```tsx
 * <Button
 *   variant="primary"
 *   size="xl"
 *   rounded="editorial"
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
  rounded = 'default',
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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses[rounded]} ${focusClasses} ${widthClass} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center gap-3">
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
