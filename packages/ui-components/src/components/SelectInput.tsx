import { forwardRef, SelectHTMLAttributes, ChangeEvent } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'onChange'> {
  /**
   * Label text displayed above the select
   */
  label?: string;
  /**
   * Error message displayed below the select
   */
  error?: string;
  /**
   * The callback fired when the value changes.
   */
  onChange: (value: string) => void;
  /**
   * Shows red asterisk next to label
   */
  required?: boolean;
  /**
   * Options for the select dropdown
   */
  options: SelectOption[];
  /**
   * Placeholder text for empty option
   */
  placeholder?: string;
  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;
  /**
   * Additional CSS classes for the select element
   */
  selectClassName?: string;
}

/**
 * Reusable select input component with consistent styling
 *
 * @example
 * ```tsx
 * <SelectInput
 *   label="Degree"
 *   options={degreeOptions}
 *   value={degree}
 *   onChange={setDegree}
 *   placeholder="Select degree"
 * />
 * ```
 */
export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({
    label,
    error,
    required,
    options,
    placeholder,
    containerClassName = '',
    selectClassName = '',
    id,
    onChange,
    ...props
  }, ref) => {
    const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    const baseSelectClasses =
      'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition bg-theme-bg-input text-theme-text-primary placeholder:text-theme-text-muted';

    const defaultBorderClasses =
      'border border-theme-border-default focus:ring-theme-primary';

    const errorClasses = error
      ? 'border-theme-status-error-border focus:ring-theme-status-error-text'
      : defaultBorderClasses;

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value);
    };

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-theme-text-secondary mb-2"
          >
            {label}
            {required && <span className="text-theme-status-error-text ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={`${baseSelectClasses} ${errorClasses} ${selectClassName}`}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1 text-sm text-theme-status-error-text"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectInput.displayName = 'SelectInput';
