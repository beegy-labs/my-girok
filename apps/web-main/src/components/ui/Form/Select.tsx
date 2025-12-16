export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

/**
 * Select Component
 *
 * A reusable select dropdown component with built-in support for:
 * - Labels, errors, and hints
 * - Dark mode
 * - Placeholder option
 * - Full accessibility (ARIA labels, focus management)
 *
 * @example
 * ```tsx
 * <Select
 *   label="Paper Size"
 *   value={paperSize}
 *   onChange={setPaperSize}
 *   options={[
 *     { value: 'A4', label: 'A4' },
 *     { value: 'LETTER', label: 'Letter' }
 *   ]}
 *   required
 * />
 * ```
 */
export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  id,
  name,
  className = '',
}: SelectProps) {
  const selectId = id || name || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);

  return (
    <div className={`mb-6 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-vintage-text-secondary dark:text-dark-text-secondary mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select */}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={
          hasError
            ? `${selectId}-error`
            : hint
            ? `${selectId}-hint`
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
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Error Message */}
      {hasError && (
        <p
          id={`${selectId}-error`}
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
          id={`${selectId}-hint`}
          className="mt-2 text-sm text-vintage-text-muted dark:text-dark-text-tertiary"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
