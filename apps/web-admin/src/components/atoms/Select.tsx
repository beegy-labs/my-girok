// apps/web-admin/src/components/atoms/Select.tsx
import { memo, forwardRef, SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  label?: string;
  error?: string;
}

export const Select = memo(
  forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, label, error, className = '', id, ...props }, ref) => {
      const selectId = id || props.name;

      return (
        <div className="w-full">
          {label && (
            <label
              htmlFor={selectId}
              className="block text-sm font-medium text-theme-text-primary mb-2"
            >
              {label}
            </label>
          )}
          <select
            ref={ref}
            id={selectId}
            className={`
            w-full px-3 py-2
            bg-theme-bg-secondary border border-theme-border-default rounded-lg
            text-theme-text-primary text-sm
            focus:outline-none focus:ring-2 focus:ring-theme-primary
            ${error ? 'border-theme-status-error-border focus:ring-theme-status-error-text' : ''}
            ${className}
          `}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-sm text-theme-status-error-text">{error}</p>}
        </div>
      );
    },
  ),
);

Select.displayName = 'Select';
