import { forwardRef, SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  /**
   * Label text displayed above the select
   */
  label?: string;
  /**
   * Error message displayed below the select
   */
  error?: string;
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
  /**
   * Color variant for the select
   */
  variant?: 'amber' | 'gray';
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
 *   onChange={(e) => setDegree(e.target.value)}
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
    variant = 'gray',
    id,
    ...props
  }, ref) => {
    const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    const baseSelectClasses = 'w-full px-4 py-3 bg-white rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all text-gray-900';

    const variantClasses = {
      amber: 'border border-amber-200 focus:ring-amber-400',
      gray: 'border border-gray-300 focus:ring-amber-400',
    };

    const errorClasses = error
      ? 'border-red-500 focus:ring-red-500'
      : variantClasses[variant];

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={`${baseSelectClasses} ${errorClasses} ${selectClassName}`}
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
            className="mt-1 text-sm text-red-600"
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
