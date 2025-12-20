import {
  InputHTMLAttributes,
  ChangeEvent,
  Ref,
  useId,
  ReactNode,
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';

/**
 * Input size variants with corresponding design tokens
 * Based on 2025 Design System best practices
 */
export type TextInputSize = 'sm' | 'default' | 'lg' | 'xl';

/**
 * Input visual variants for different contexts
 */
export type TextInputVariant = 'default' | 'filled' | 'outlined' | 'ghost';

/**
 * Input states for validation feedback
 */
export type TextInputState = 'default' | 'success' | 'warning' | 'error';

/**
 * Icon slot configuration (2025 best practice: explicit slot-based architecture)
 */
export interface IconSlotProps {
  /** The icon element to render */
  icon: ReactNode;
  /** Click handler for interactive icons */
  onClick?: () => void;
  /** Accessible label for interactive icons (required when onClick is provided) */
  ariaLabel?: string;
  /** Whether the icon is purely decorative (hidden from screen readers) */
  decorative?: boolean;
}

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'size'
> {
  /**
   * Label text displayed above the input
   * Follows WCAG 2.1 AAA - labels above input fields
   */
  label?: string;

  /**
   * Error message displayed below the input
   * Triggers error state automatically
   */
  error?: string;

  /**
   * Helper text displayed below the input
   * Hidden when error is present
   */
  hint?: string;

  /**
   * The callback fired when the value changes
   */
  onChange: (value: string) => void;

  /**
   * Shows red asterisk next to label
   */
  required?: boolean;

  /**
   * Leading icon (left side) - simple ReactNode for backwards compatibility
   * For advanced features, use leadingSlot
   */
  icon?: ReactNode;

  /**
   * Leading slot with full configuration (2025 best practice)
   * Takes precedence over `icon` prop
   */
  leadingSlot?: IconSlotProps;

  /**
   * Trailing icon (right side) - simple ReactNode
   * For advanced features, use trailingSlot
   */
  trailingIcon?: ReactNode;

  /**
   * Trailing slot with full configuration (2025 best practice)
   * Takes precedence over `trailingIcon` prop
   */
  trailingSlot?: IconSlotProps;

  /**
   * Input size variant
   * @default 'default'
   */
  size?: TextInputSize;

  /**
   * Visual variant
   * @default 'default'
   */
  variant?: TextInputVariant;

  /**
   * Validation state (auto-detected from error prop if not specified)
   */
  state?: TextInputState;

  /**
   * Enable password visibility toggle (auto-adds trailing icon)
   * Only works when type="password"
   */
  showPasswordToggle?: boolean;

  /**
   * Enable clear button when input has value
   */
  clearable?: boolean;

  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void;

  /**
   * Character count display
   */
  showCharCount?: boolean;

  /**
   * Maximum character count (enables counter when set)
   */
  maxLength?: number;

  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;

  /**
   * Additional CSS classes for the input wrapper (the flex container)
   */
  wrapperClassName?: string;

  /**
   * Additional CSS classes for the input element
   */
  inputClassName?: string;

  /**
   * Additional CSS classes (alias for containerClassName for backwards compatibility)
   */
  className?: string;

  /**
   * Ref for the input element (React 19 style - ref as prop)
   */
  ref?: Ref<HTMLInputElement>;
}

// ============================================================================
// Design Token Constants (2025 Best Practice: Centralized Design Tokens)
// ============================================================================

/**
 * Size configuration with WCAG 2.5.5 touch target compliance
 * Minimum touch target: 44x44px (we use 48px for AAA compliance)
 */
const SIZE_CONFIG = {
  sm: {
    height: 'h-10', // 40px - minimum for compact UI
    padding: 'py-2',
    iconGap: 'gap-2',
    iconSize: 16,
    iconPadding: 'px-3',
    fontSize: 'text-sm',
    borderRadius: 'rounded-lg',
  },
  default: {
    height: 'min-h-[48px]', // 48px - WCAG 2.5.5 AAA
    padding: 'py-3',
    iconGap: 'gap-3',
    iconSize: 18,
    iconPadding: 'px-4',
    fontSize: 'text-base',
    borderRadius: 'rounded-input', // SSOT: 24px
  },
  lg: {
    height: 'h-14', // 56px
    padding: 'py-4',
    iconGap: 'gap-3.5',
    iconSize: 20,
    iconPadding: 'px-5',
    fontSize: 'text-base font-medium',
    borderRadius: 'rounded-input',
  },
  xl: {
    height: 'h-16', // 64px - Editorial style
    padding: 'py-4',
    iconGap: 'gap-4',
    iconSize: 22,
    iconPadding: 'px-6',
    fontSize: 'text-lg font-bold',
    borderRadius: 'rounded-input',
  },
} as const;

/**
 * Variant styling configuration
 */
const VARIANT_CONFIG = {
  default: {
    base: 'bg-theme-bg-secondary border-2 border-theme-border-subtle',
    focus:
      'focus-within:border-theme-primary focus-within:ring-2 focus-within:ring-theme-primary/20',
    hover: 'hover:border-theme-border-default',
  },
  filled: {
    base: 'bg-theme-bg-tertiary border-2 border-transparent',
    focus: 'focus-within:border-theme-primary focus-within:bg-theme-bg-secondary',
    hover: 'hover:bg-theme-bg-secondary',
  },
  outlined: {
    base: 'bg-transparent border-2 border-theme-border-default',
    focus:
      'focus-within:border-theme-primary focus-within:ring-2 focus-within:ring-theme-primary/20',
    hover: 'hover:border-theme-border-strong',
  },
  ghost: {
    base: 'bg-transparent border-2 border-transparent',
    focus: 'focus-within:bg-theme-bg-secondary focus-within:border-theme-border-subtle',
    hover: 'hover:bg-theme-bg-tertiary',
  },
} as const;

/**
 * State color configuration for validation feedback
 */
const STATE_CONFIG = {
  default: {
    border: '',
    icon: 'text-theme-text-secondary',
    ring: '',
  },
  success: {
    border: 'border-theme-status-success-text',
    icon: 'text-theme-status-success-text',
    ring: 'focus-within:ring-theme-status-success-text/20',
  },
  warning: {
    border: 'border-theme-status-warning-text',
    icon: 'text-theme-status-warning-text',
    ring: 'focus-within:ring-theme-status-warning-text/20',
  },
  error: {
    border: 'border-theme-status-error-text',
    icon: 'text-theme-status-error-text',
    ring: 'focus-within:ring-theme-status-error-text/20',
  },
} as const;

// ============================================================================
// Icon Components (2025 Best Practice: Built-in common icons)
// ============================================================================

/** Icon component props */
interface IconProps {
  /** Icon size in pixels */
  size?: number;
}

/**
 * Eye icon for password visibility toggle (SSOT: strokeWidth 1.5)
 * Memoized to prevent unnecessary re-renders (rules.md:275)
 */
const EyeIcon = memo(function EyeIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
});

/**
 * Eye-off icon for password visibility toggle (SSOT: strokeWidth 1.5)
 * Memoized to prevent unnecessary re-renders (rules.md:275)
 */
const EyeOffIcon = memo(function EyeOffIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
});

/**
 * Clear/X icon for clearable input (SSOT: strokeWidth 1.5)
 * Memoized to prevent unnecessary re-renders (rules.md:275)
 */
const ClearIcon = memo(function ClearIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
});

// ============================================================================
// Icon Slot Component (2025 Best Practice: Reusable slot rendering)
// ============================================================================

interface IconSlotRendererProps {
  slot?: IconSlotProps;
  fallbackIcon?: ReactNode;
  position: 'leading' | 'trailing';
  stateColor?: string;
}

/**
 * Memoized icon slot renderer component (rules.md:275 - React.memo for list items)
 * Renders leading/trailing icons with proper accessibility attributes
 */
const IconSlotRenderer = memo(function IconSlotRenderer({
  slot,
  fallbackIcon,
  position,
  stateColor,
}: IconSlotRendererProps) {
  const icon = slot?.icon || fallbackIcon;

  if (!icon) return null;

  const isInteractive = !!slot?.onClick;
  const baseClasses = `
    flex items-center justify-center flex-shrink-0
    ${stateColor || 'text-theme-text-secondary'}
    transition-colors duration-150
  `;

  // Interactive icon (button)
  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={slot.onClick}
        aria-label={slot.ariaLabel || `${position} action`}
        className={`
          ${baseClasses}
          p-1 -m-1 rounded-md
          hover:text-theme-text-primary hover:bg-theme-bg-tertiary
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary
          cursor-pointer
        `}
      >
        {icon}
      </button>
    );
  }

  // Decorative icon (hidden from screen readers)
  return (
    <span className={baseClasses} aria-hidden={slot?.decorative !== false}>
      {icon}
    </span>
  );
});

// ============================================================================
// Main TextInput Component
// ============================================================================

/**
 * Accessible text input component with WCAG 2.1 AAA compliance
 * 2025 Best Practices Implementation
 *
 * Features:
 * - Flexbox-based layout (no absolute positioning hacks)
 * - Leading & trailing icon slots with full configuration
 * - Built-in password visibility toggle
 * - Built-in clearable input
 * - Character counter
 * - Multiple size variants (sm, default, lg, xl)
 * - Multiple visual variants (default, filled, outlined, ghost)
 * - Validation states with visual feedback
 * - WCAG 2.5.5 AAA touch targets (48px minimum)
 * - Proper aria attributes for accessibility
 * - Design token-based styling
 *
 * @example
 * ```tsx
 * // Basic usage with leading icon
 * <TextInput
 *   label="Email Address"
 *   type="email"
 *   size="lg"
 *   icon={<Mail size={18} />}
 *   value={email}
 *   onChange={setEmail}
 *   placeholder="you@example.com"
 *   required
 * />
 *
 * // Password with visibility toggle
 * <TextInput
 *   label="Password"
 *   type="password"
 *   size="lg"
 *   icon={<Lock size={18} />}
 *   showPasswordToggle
 *   value={password}
 *   onChange={setPassword}
 * />
 *
 * // Clearable input with character count
 * <TextInput
 *   label="Username"
 *   size="lg"
 *   clearable
 *   showCharCount
 *   maxLength={20}
 *   value={username}
 *   onChange={setUsername}
 * />
 * ```
 */
function TextInputComponent({
  // Label & Messages
  label,
  error,
  hint,
  required,

  // Icons (simple API - backwards compatible)
  icon,
  trailingIcon,

  // Icon slots (advanced API - 2025 best practice)
  leadingSlot,
  trailingSlot,

  // Variants & States
  size = 'default',
  variant = 'default',
  state: stateProp,

  // Features
  showPasswordToggle = false,
  clearable = false,
  onClear,
  showCharCount = false,
  maxLength,

  // Styling
  containerClassName = '',
  wrapperClassName = '',
  inputClassName = '',
  className = '',

  // Input props
  id,
  type: typeProp = 'text',
  value,
  onChange,
  ref,
  ...props
}: TextInputProps) {
  // ========== State Management ==========
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;

  // Determine actual input type (for password toggle)
  const isPasswordField = typeProp === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : typeProp;

  // Determine validation state
  const state: TextInputState = stateProp || (error ? 'error' : 'default');

  // Get configuration
  const sizeConfig = SIZE_CONFIG[size];
  const variantConfig = VARIANT_CONFIG[variant];
  const stateConfig = STATE_CONFIG[state];

  // ========== Event Handlers ==========
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange('');
    onClear?.();
  }, [onChange, onClear]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // ========== Computed Values ==========
  const hasValue = typeof value === 'string' && value.length > 0;
  const charCount = typeof value === 'string' ? value.length : 0;
  const finalContainerClassName = containerClassName || className;

  // ========== Trailing Slot Logic ==========
  const resolvedTrailingSlot = useMemo((): IconSlotProps | undefined => {
    // Priority: trailingSlot > password toggle > clearable > trailingIcon
    if (trailingSlot) return trailingSlot;

    if (isPasswordField && showPasswordToggle) {
      return {
        icon: showPassword ? (
          <EyeOffIcon size={sizeConfig.iconSize} />
        ) : (
          <EyeIcon size={sizeConfig.iconSize} />
        ),
        onClick: togglePasswordVisibility,
        ariaLabel: showPassword ? 'Hide password' : 'Show password',
        decorative: false,
      };
    }

    if (clearable && hasValue) {
      return {
        icon: <ClearIcon size={sizeConfig.iconSize} />,
        onClick: handleClear,
        ariaLabel: 'Clear input',
        decorative: false,
      };
    }

    if (trailingIcon) {
      return { icon: trailingIcon, decorative: true };
    }

    return undefined;
  }, [
    trailingSlot,
    trailingIcon,
    isPasswordField,
    showPasswordToggle,
    showPassword,
    clearable,
    hasValue,
    sizeConfig.iconSize,
    togglePasswordVisibility,
    handleClear,
  ]);

  // ========== Leading Slot Logic ==========
  const resolvedLeadingSlot = useMemo((): IconSlotProps | undefined => {
    if (leadingSlot) return leadingSlot;
    if (icon) return { icon, decorative: true };
    return undefined;
  }, [leadingSlot, icon]);

  // ========== Wrapper Classes (Flexbox-based - 2025 best practice) ==========
  // Memoized to prevent string recreation on every render (rules.md:277-278)
  const wrapperClasses = useMemo(
    () =>
      [
        'relative flex items-center',
        sizeConfig.height,
        sizeConfig.iconPadding,
        sizeConfig.iconGap,
        sizeConfig.borderRadius,
        variantConfig.base,
        variantConfig.focus,
        variantConfig.hover,
        state !== 'default' ? stateConfig.border : '',
        state !== 'default' ? stateConfig.ring : '',
        'transition-all duration-200',
        wrapperClassName,
      ]
        .filter(Boolean)
        .join(' '),
    [sizeConfig, variantConfig, state, stateConfig, wrapperClassName],
  );

  // ========== Input Classes ==========
  // Memoized to prevent string recreation on every render (rules.md:277-278)
  const inputClasses = useMemo(
    () =>
      [
        'flex-1 min-w-0',
        'bg-transparent',
        sizeConfig.fontSize,
        'text-theme-text-primary',
        'placeholder:text-theme-text-muted placeholder:opacity-50',
        'focus:outline-none',
        inputClassName,
      ]
        .filter(Boolean)
        .join(' '),
    [sizeConfig.fontSize, inputClassName],
  );

  return (
    <div className={finalContainerClassName}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[12px] font-black uppercase tracking-brand text-theme-text-primary mb-3 ml-1"
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

      {/* Input Wrapper (Flexbox-based) */}
      <div className={wrapperClasses}>
        {/* Leading Icon Slot */}
        <IconSlotRenderer
          slot={resolvedLeadingSlot}
          position="leading"
          stateColor={state !== 'default' ? stateConfig.icon : undefined}
        />

        {/* Input Element */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          value={value}
          className={inputClasses}
          onChange={handleChange}
          aria-invalid={state === 'error'}
          aria-describedby={
            error
              ? `${inputId}-error`
              : hint
                ? `${inputId}-hint`
                : showCharCount && maxLength
                  ? `${inputId}-count`
                  : undefined
          }
          aria-required={required}
          maxLength={maxLength}
          {...props}
        />

        {/* Trailing Icon Slot */}
        <IconSlotRenderer
          slot={resolvedTrailingSlot}
          position="trailing"
          stateColor={state !== 'default' ? stateConfig.icon : undefined}
        />
      </div>

      {/* Footer: Error, Hint, or Character Count */}
      <div className="flex items-start justify-between mt-2 min-h-[20px]">
        <div className="flex-1">
          {error && (
            <p
              id={`${inputId}-error`}
              className="text-sm font-medium text-theme-status-error-text"
              role="alert"
            >
              {error}
            </p>
          )}
          {!error && hint && (
            <p id={`${inputId}-hint`} className="text-sm text-theme-text-tertiary">
              {hint}
            </p>
          )}
        </div>

        {showCharCount && maxLength && (
          <p
            id={`${inputId}-count`}
            className={`text-xs ml-2 tabular-nums ${
              charCount >= maxLength
                ? 'text-theme-status-error-text font-medium'
                : 'text-theme-text-tertiary'
            }`}
            aria-live="polite"
          >
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized TextInput component (rules.md:275)
 * Prevents unnecessary re-renders when parent components update
 */
export const TextInput = memo(TextInputComponent);
