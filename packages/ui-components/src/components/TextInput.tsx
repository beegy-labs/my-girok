import { InputHTMLAttributes, ChangeEvent, Ref, useId, ReactNode } from 'react';

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'size'
> {
  /**
   * Label text displayed above the input
   */
  label?: string;
  /**
   * Error message displayed below the input
   */
  error?: string;
  /**
   * Helper text displayed below the input
   */
  hint?: string;
  /**
   * The callback fired when the value changes.
   */
  onChange: (value: string) => void;
  /**
   * Shows red asterisk next to label
   */
  required?: boolean;
  /**
   * Icon to display on the left side of the input
   */
  icon?: ReactNode;
  /**
   * Input size variant
   */
  size?: 'default' | 'lg';
  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;
  /**
   * Additional CSS classes for the input element
   */
  inputClassName?: string;
  /**
   * Additional CSS classes (alias for containerClassName for backwards compatibility)
   */
  className?: string;
  /**
   * Ref for the input element (React 19 style - ref as prop)
   */
  ref?: Ref<HTMLInputElement>;
}

// Static class definitions (defined outside component for performance)
// V0.0.1 AAA Workstation Design System
// Base input classes with WCAG compliance:
// - min-h-[48px] for touch target (WCAG 2.5.5)
// - text-base (16px) for readability
// - focus-visible for keyboard navigation
const baseInputClasses =
  'w-full text-base bg-theme-bg-secondary text-theme-text-primary placeholder:text-theme-text-muted placeholder:opacity-50 focus-visible:outline-none focus-visible:border-theme-primary transition-all duration-200';

const defaultBorderClasses = 'border-2 border-theme-border-subtle';

const sizeClasses = {
  default: 'min-h-[48px] px-4 py-3 rounded-xl',
  lg: 'h-16 px-6 py-4 rounded-input font-bold', // SSOT: --border-radius-input: 24px
} as const;

const focusClasses =
  'focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

/**
 * Accessible text input component with WCAG 2.1 AAA compliance
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Minimum 48px touch target height (WCAG 2.5.5)
 * - Large (64px) size option for editorial forms
 * - Optional icon support
 * - Proper label association with htmlFor
 * - Error states with aria-invalid and role="alert"
 * - High contrast focus ring for keyboard navigation
 * - 16px minimum font size for optimal readability
 * - React 19 compatible (ref as prop)
 *
 * @example
 * ```tsx
 * <TextInput
 *   label="Email Address"
 *   type="email"
 *   size="lg"
 *   icon={<Mail size={18} />}
 *   value={email}
 *   onChange={setEmail}
 *   placeholder="you@example.com"
 *   required
 * />
 * ```
 */
export function TextInput({
  label,
  error,
  hint,
  required,
  icon,
  size = 'default',
  containerClassName = '',
  inputClassName = '',
  className = '',
  id,
  onChange,
  ref,
  ...props
}: TextInputProps) {
  // className is an alias for containerClassName for backwards compatibility
  const finalContainerClassName = containerClassName || className;
  // useId provides stable, unique IDs for accessibility (React 18+)
  const generatedId = useId();
  const inputId = id || generatedId;

  const errorClasses = error
    ? 'border-theme-status-error-text focus-visible:ring-theme-status-error-text'
    : defaultBorderClasses;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const iconPaddingClass = icon ? (size === 'lg' ? 'pl-14' : 'pl-12') : '';

  return (
    <div className={finalContainerClassName}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-widest text-theme-text-primary mb-2 ml-1"
        >
          {label}
          {required && (
            <span className="text-theme-status-error-text ml-1" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(required)</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className={`absolute left-5 top-1/2 -translate-y-1/2 text-theme-text-secondary`}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseInputClasses} ${sizeClasses[size]} ${errorClasses} ${focusClasses} ${iconPaddingClass} ${inputClassName}`}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-required={required}
          {...props}
        />
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-2 text-sm font-medium text-theme-status-error-text"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-2 text-sm text-theme-text-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}
