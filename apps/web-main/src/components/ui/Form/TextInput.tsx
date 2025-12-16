import React from 'react';

export interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'password' | 'url' | 'month';
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  id?: string;
  name?: string;
  autoComplete?: string;
  maxLength?: number;
  className?: string;
  onBlur?: () => void;
}

/**
 * TextInput Component
 *
 * A reusable text input component with built-in support for:
 * - Labels, errors, and hints
 * - Dark mode
 * - Various input types (text, email, tel, password, url)
 * - Icons
 * - Full accessibility (ARIA labels, focus management)
 *
 * @example
 * ```tsx
 * <TextInput
 *   label="Email"
 *   value={email}
 *   onChange={setEmail}
 *   type="email"
 *   required
 *   placeholder="you@example.com"
 *   hint="We'll never share your email"
 *   error={emailError}
 * />
 * ```
 */
export default function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  icon,
  id,
  name,
  autoComplete,
  maxLength,
  className = '',
  onBlur,
}: TextInputProps) {
  const inputId = id || name || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);

  return (
    <div className={`mb-6 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-theme-text-secondary mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icon (if provided) */}
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${inputId}-error`
              : hint
              ? `${inputId}-hint`
              : undefined
          }
          className={`
            w-full px-4 py-3
            ${icon ? 'pl-10' : ''}
            bg-theme-bg-input
            border
            ${
              hasError
                ? 'border-red-300 dark:border-red-700 focus:ring-red-400'
                : 'border-theme-border-default focus:ring-theme-primary'
            }
            rounded-lg
            focus:outline-none focus:ring-2 focus:border-transparent
            transition-all
            text-theme-text-primary
            placeholder:text-theme-text-muted
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      </div>

      {/* Error Message */}
      {hasError && (
        <p
          id={`${inputId}-error`}
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
          id={`${inputId}-hint`}
          className="mt-2 text-sm text-theme-text-muted"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
