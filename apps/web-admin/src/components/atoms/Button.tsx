// apps/web-admin/src/components/atoms/Button.tsx
import { memo, forwardRef, ButtonHTMLAttributes, ReactNode, useCallback } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
import { trackClick } from '../../lib/otel';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children: ReactNode;
  /** When set, tracks button clicks with this name */
  trackingName?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-theme-primary text-btn-primary-text hover:opacity-90',
  secondary:
    'border border-theme-border-default bg-theme-bg-card text-theme-text-primary hover:bg-theme-bg-secondary',
  ghost: 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary',
  danger: 'bg-btn-danger-bg text-btn-danger-text hover:bg-btn-danger-bg-hover',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        variant = 'primary',
        size = 'md',
        icon: Icon,
        iconPosition = 'left',
        loading = false,
        disabled,
        className = '',
        children,
        trackingName,
        onClick,
        ...props
      },
      ref,
    ) => {
      const isDisabled = disabled || loading;

      const handleClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
          if (trackingName) {
            const buttonText = typeof children === 'string' ? children : undefined;
            trackClick(trackingName, props.id, buttonText);
          }
          onClick?.(e);
        },
        [trackingName, onClick, children, props.id],
      );

      return (
        <button
          ref={ref}
          disabled={isDisabled}
          onClick={handleClick}
          className={`
          inline-flex items-center justify-center rounded-lg font-medium
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
          {...props}
        >
          {loading ? (
            <Loader2 size={iconSizes[size]} className="animate-spin" />
          ) : (
            Icon && iconPosition === 'left' && <Icon size={iconSizes[size]} />
          )}
          <span>{children}</span>
          {!loading && Icon && iconPosition === 'right' && <Icon size={iconSizes[size]} />}
        </button>
      );
    },
  ),
);

Button.displayName = 'Button';
