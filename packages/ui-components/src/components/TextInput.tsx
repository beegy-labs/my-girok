import { InputHTMLAttributes, ChangeEvent, Ref } from 'react';

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
  /**
   * Ref for the input element (React 19 style - ref as prop)
   */
  ref?: Ref<HTMLInputElement>;
}

/**
 * Accessible text input component with WCAG 2.1 AA compliance
 *
 * Features:
 * - Minimum 44px touch target height (WCAG 2.5.5)
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
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    // Base input classes with WCAG compliance:
    // - min-h-[48px] for touch target (WCAG 2.5.5)
    // - text-base (16px) for readability
    // - focus-visible for keyboard navigation
    const baseInputClasses = `
      w-full min-h-[48px] px-4 py-3
      text-base rounded-xl
      bg-theme-bg-input text-theme-text-primary
      placeholder:text-theme-text-muted
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-theme-focus-ring focus-visible:border-transparent
      transition-all duration-200
    `.trim().replace(/\s+/g, ' ');

    const defaultBorderClasses = 'border border-theme-border-default';

    const errorClasses = error
      ? 'border-theme-status-error-text focus-visible:ring-theme-status-error-text'
      : defaultBorderClasses;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    };

    return (
      <div className={finalContainerClassName}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-semibold text-theme-text-secondary mb-2"
          >
            {label}
            {required && (
              <span className="text-theme-status-error-text ml-1" aria-hidden="true">*</span>
            )}
            {required && <span className="sr-only">(required)</span>}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`${baseInputClasses} ${errorClasses} ${inputClassName}`}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-required={required}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-base text-theme-status-error-text"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p
            id={`${inputId}-hint`}
            className="mt-2 text-base text-theme-text-tertiary"
          >
            {hint}
          </p>
        )}
      </div>
  );
}
