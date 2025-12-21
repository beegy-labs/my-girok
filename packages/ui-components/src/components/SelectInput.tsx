import { SelectHTMLAttributes, ChangeEvent, Ref, useId, useCallback, memo } from 'react';
import { focusClasses } from '../styles/constants';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Static class definitions (defined outside component for performance)
 * V0.0.1 AAA Workstation Design System
 *
 * Base select classes with WCAG compliance:
 * - min-h-input = 48px (WCAG 2.5.5 AAA touch target) - SSOT
 * - text-base (16px) for readability
 * - focus ring via focusClasses (4px, SSOT)
 */
const baseSelectClasses =
  'w-full min-h-input px-4 py-3 text-base rounded-input bg-theme-bg-input text-theme-text-primary focus-visible:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer';

const defaultBorderClasses = 'border border-theme-border-default';

export interface SelectInputProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'onChange'
> {
  /**
   * Label text displayed above the select
   */
  label?: string;
  /**
   * Error message displayed below the select
   */
  error?: string;
  /**
   * Helper text displayed below the select
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
   * Ref for the select element (React 19 style - ref as prop)
   */
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Accessible select input component with WCAG 2.1 AAA compliance
 *
 * Features:
 * - Minimum 48px touch target height (WCAG 2.5.5)
 * - Proper label association with htmlFor
 * - Error states with aria-invalid and role="alert"
 * - High contrast focus ring for keyboard navigation
 * - 16px minimum font size for optimal readability
 * - React 19 compatible (ref as prop)
 * - Memoized to prevent unnecessary re-renders (rules.md:275)
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
function SelectInputComponent({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  containerClassName = '',
  selectClassName = '',
  id,
  onChange,
  ref,
  ...props
}: SelectInputProps) {
  // useId provides stable, unique IDs for accessibility (React 18+)
  const generatedId = useId();
  const selectId = id || generatedId;

  const errorClasses = error
    ? 'border-theme-status-error-text focus-visible:ring-theme-status-error-text'
    : defaultBorderClasses;

  // Memoized change handler (rules.md:276)
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-brand-sm font-black uppercase tracking-brand text-theme-text-primary mb-3 ml-1"
        >
          {label}
          {required && (
            <span className="text-theme-status-error-text ml-1" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(required)</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        className={`${baseSelectClasses} ${errorClasses} ${focusClasses} ${selectClassName}`}
        onChange={handleChange}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        aria-required={required}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint && !error && (
        <p id={`${selectId}-hint`} className="mt-2 text-base text-theme-text-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${selectId}-error`}
          className="mt-2 text-base text-theme-status-error-text"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Memoized SelectInput component (rules.md:275)
 * Prevents unnecessary re-renders when parent components update
 */
export const SelectInput = memo(SelectInputComponent);
