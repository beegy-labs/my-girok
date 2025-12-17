import { forwardRef, TextareaHTMLAttributes, useId, useMemo } from 'react';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
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
}

/**
 * Reusable textarea component with label and error handling
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
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    label,
    error,
    hint,
    onChange,
    className = '',
    id,
    ...props
  }, ref) => {
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

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-theme-text-secondary mb-2"
          >
            {label}
            {props.required && <span className="text-theme-status-error-text ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          onChange={(e) => onChange?.(e.target.value)}
          className={`
            w-full
            px-4 py-3
            bg-theme-bg-input
            border border-theme-border-default
            rounded-lg
            text-theme-text-primary
            placeholder:text-theme-text-muted
            focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            resize-y
            ${error ? 'border-theme-status-error-border focus:ring-theme-status-error-text' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1 text-sm text-theme-text-tertiary">{hint}</p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-sm text-theme-status-error-text" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
