import { TextareaHTMLAttributes, useId, Ref, useCallback, memo } from 'react';
import { focusClasses } from '../styles/constants';

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

// ============================================================================
// Static Class Definitions (2025 Best Practice: Outside component for performance)
// ============================================================================

/**
 * Base textarea classes with WCAG compliance:
 * - min-h for adequate touch target
 * - text-base (16px) for readability
 * - focus ring via focusClasses (4px, SSOT)
 */
const baseTextareaClasses =
  'w-full min-h-[120px] px-4 py-3 text-base rounded-input bg-theme-bg-input text-theme-text-primary placeholder:text-theme-text-muted focus-visible:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-y';

const defaultBorderClasses = 'border border-theme-border-default';

/**
 * Accessible textarea component with WCAG 2.1 AAA compliance
 *
 * Features:
 * - Minimum 44px touch target height (WCAG 2.5.5)
 * - Proper label association with htmlFor
 * - Error states with aria-invalid and role="alert"
 * - High contrast focus ring for keyboard navigation
 * - 16px minimum font size for optimal readability
 * - React 19 compatible (ref as prop)
 * - Memoized to prevent unnecessary re-renders (rules.md:275)
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
function TextAreaComponent({
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

  // 2025 best practice: inline simple string logic (no memoization needed)
  const ariaDescribedBy = error ? errorId : hint ? hintId : undefined;

  const errorClasses = error
    ? 'border-theme-status-error-text focus-visible:ring-theme-status-error-text'
    : defaultBorderClasses;

  // Memoized change handler (rules.md:276)
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event.target.value);
    },
    [onChange],
  );

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-brand-sm font-black uppercase tracking-brand text-theme-text-primary mb-3 ml-1"
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
        onChange={handleChange}
        className={`${baseTextareaClasses} ${errorClasses} ${focusClasses} ${className}`}
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

/**
 * Memoized TextArea component (rules.md:275)
 * Prevents unnecessary re-renders when parent components update
 */
export const TextArea = memo(TextAreaComponent);
