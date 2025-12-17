import { forwardRef, InputHTMLAttributes } from 'react';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  /**
   * Label text displayed above the input
   */
  label?: string;
  /**
   * Error message displayed below the input
   */
  error?: string;
  /**
   * Shows red asterisk next to label
   */
  required?: boolean;
  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;
  /**
   * Additional CSS classes for the input element
   */
  inputClassName?: string;
}

/**
 * Reusable text input component with consistent styling
 *
 * @example
 * ```tsx
 * <TextInput
 *   label="Email Address"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   placeholder="you@example.com"
 *   required
 * />
 * ```
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({
    label,
    error,
    required,
    containerClassName = '',
    inputClassName = '',
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    const baseInputClasses =
      'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition bg-theme-bg-input text-theme-text-primary placeholder:text-theme-text-muted';

    const defaultBorderClasses =
      'border border-theme-border-default focus:ring-theme-primary';

    const errorClasses = error
      ? 'border-red-500 focus:ring-red-500'
      : defaultBorderClasses;

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-theme-text-secondary mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`${baseInputClasses} ${errorClasses} ${inputClassName}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
