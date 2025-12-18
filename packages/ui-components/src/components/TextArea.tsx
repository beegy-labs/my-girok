import { TextareaHTMLAttributes, useId, useMemo, Ref } from 'react';

export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> {
  /**
   * Label text displayed above the textarea
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text shown below the textarea
   */
  hint?: string;
  /**
   * onChange handler that receives the value directly
   */
  onChange?: (value: string) => void;
  /**
   * Ref for the textarea element (React 19 style - ref as prop)
   */
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Accessible textarea component with WCAG 2.1 AA compliance
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
 * <TextArea
 *   label="Description"
 *   value={description}
 *   onChange={setDescription}
 *   rows={4}
 * />
 * ```
 */
export function TextArea({
  label,
  error,
  hint,
  onChange,
  className = '',
  id,
  ref,
  ...props
}: TextAreaProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  // Build aria-describedby based on present elements
  const ariaDescribedBy = useMemo(() => {
    const ids: string[] = [];
    if (error) ids.push(errorId);
    if (hint && !error) ids.push(hintId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }, [error, hint, errorId, hintId]);

  // Base textarea classes with WCAG compliance:
  // - min-h for adequate touch target
  // - text-base (16px) for readability
  // - focus-visible for keyboard navigation
  const baseTextareaClasses =
    'w-full min-h-[120px] px-4 py-3 text-base rounded-xl bg-theme-bg-input text-theme-text-primary placeholder:text-theme-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-theme-focus-ring focus-visible:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-y';

  const defaultBorderClasses = 'border border-theme-border-default';

  const errorClasses = error
    ? 'border-theme-status-error-text focus-visible:ring-theme-status-error-text'
    : defaultBorderClasses;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-base font-semibold text-theme-text-secondary mb-2"
        >
          {label}
          {props.required && (
            <span className="text-theme-status-error-text ml-1" aria-hidden="true">
              *
            </span>
          )}
          {props.required && <span className="sr-only">(required)</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={ariaDescribedBy}
        aria-required={props.required}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${baseTextareaClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-2 text-base text-theme-text-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-base text-theme-status-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
