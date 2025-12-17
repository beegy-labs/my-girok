import { forwardRef, TextareaHTMLAttributes, useId } from 'react';

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

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-theme-text-secondary mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
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
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-sm text-theme-text-tertiary">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
