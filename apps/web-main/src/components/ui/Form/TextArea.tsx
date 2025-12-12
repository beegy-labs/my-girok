export interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  maxLength?: number;
  showCharCount?: boolean;
  className?: string;
}

/**
 * TextArea Component
 *
 * A reusable textarea component with built-in support for:
 * - Labels, errors, and hints
 * - Dark mode
 * - Character counter (optional)
 * - Configurable rows
 * - Full accessibility (ARIA labels, focus management)
 *
 * @example
 * ```tsx
 * <TextArea
 *   label="Summary"
 *   value={summary}
 *   onChange={setSummary}
 *   rows={4}
 *   placeholder="Write your professional summary..."
 *   hint="Briefly describe your background and goals"
 *   maxLength={500}
 *   showCharCount
 * />
 * ```
 */
export default function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  id,
  name,
  maxLength,
  showCharCount = false,
  className = '',
}: TextAreaProps) {
  const textareaId = id || name || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);
  const charCount = value.length;
  const showCounter = showCharCount && maxLength;

  return (
    <div className={`mb-6 ${className}`}>
      {/* Label with optional character count */}
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold text-vintage-text-secondary dark:text-dark-text-secondary"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showCounter && (
            <span className="text-xs text-vintage-text-tertiary dark:text-dark-text-tertiary">
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* TextArea */}
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={
          hasError
            ? `${textareaId}-error`
            : hint
            ? `${textareaId}-hint`
            : undefined
        }
        className={`
          w-full px-4 py-3
          bg-vintage-bg-input dark:bg-dark-bg-elevated
          border
          ${
            hasError
              ? 'border-red-300 dark:border-red-700 focus:ring-red-400'
              : 'border-vintage-border-default dark:border-dark-border-default focus:ring-vintage-primary'
          }
          rounded-lg
          focus:outline-none focus:ring-2 focus:border-transparent
          transition-all
          text-vintage-text-primary dark:text-dark-text-primary
          placeholder:text-vintage-text-muted dark:placeholder:text-dark-text-tertiary
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-y
        `}
      />

      {/* Error Message */}
      {hasError && (
        <p
          id={`${textareaId}-error`}
          className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-start"
          role="alert"
        >
          <svg
            className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Hint Message */}
      {!hasError && hint && (
        <p
          id={`${textareaId}-hint`}
          className="mt-2 text-sm text-vintage-text-tertiary dark:text-dark-text-tertiary"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
