import { forwardRef, InputHTMLAttributes, ChangeEvent } from 'react';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
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
 *   onChange={setEmail}
 *   placeholder="you@example.com"
 *   required
 * />
 * ```
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({
    label,
    error,
    hint,
    required,
    containerClassName = '',
    inputClassName = '',
    className = '',
    id,
    onChange,
    ...props
  }, ref) => {
    // className is an alias for containerClassName for backwards compatibility
    const finalContainerClassName = containerClassName || className;
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    const baseInputClasses =
      'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition bg-theme-bg-input text-theme-text-primary placeholder:text-theme-text-muted';

    const defaultBorderClasses =
      'border border-theme-border-default focus:ring-theme-primary';

    const errorClasses = error
      ? 'border-theme-status-error-text focus:ring-theme-status-error-text'
      : defaultBorderClasses;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    };

    return (
      <div className={finalContainerClassName}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-theme-text-secondary mb-2"
          >
            {label}
            {required && <span className="text-theme-status-error-text ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`${baseInputClasses} ${errorClasses} ${inputClassName}`}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-theme-status-error-text"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p
            id={`${inputId}-hint`}
            className="mt-1 text-sm text-theme-text-tertiary"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
