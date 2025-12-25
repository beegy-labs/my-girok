// apps/web-admin/src/components/atoms/Input.tsx
import { memo, forwardRef, InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
  label?: string;
}

export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(
    ({ icon: Icon, error, label, className = '', id, ...props }, ref) => {
      const inputId = id || props.name;

      return (
        <div className="w-full">
          {label && (
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-theme-text-primary mb-2"
            >
              {label}
            </label>
          )}
          <div className="relative">
            {Icon && (
              <Icon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary"
              />
            )}
            <input
              ref={ref}
              id={inputId}
              className={`
              w-full px-4 py-2
              bg-theme-bg-secondary border border-theme-border rounded-lg
              text-theme-text-primary placeholder:text-theme-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-theme-primary
              ${Icon ? 'pl-10' : ''}
              ${error ? 'border-theme-error focus:ring-theme-error' : ''}
              ${className}
            `}
              {...props}
            />
          </div>
          {error && <p className="mt-1 text-sm text-theme-error">{error}</p>}
        </div>
      );
    },
  ),
);

Input.displayName = 'Input';
