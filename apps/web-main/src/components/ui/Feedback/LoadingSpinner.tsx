export interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

/**
 * LoadingSpinner Component
 *
 * A loading indicator with multiple size options and optional message.
 * Can be displayed inline or as a full-screen overlay.
 *
 * Features:
 * - Full-screen and inline variants
 * - 3 size options (sm, md, lg)
 * - Optional loading message
 * - Dark mode support
 * - Animated spinning effect
 *
 * @example
 * ```tsx
 * // Full screen
 * <LoadingSpinner fullScreen message="Loading resume..." />
 *
 * // Inline
 * <LoadingSpinner size="sm" />
 * ```
 */
export default function LoadingSpinner({
  fullScreen = false,
  size = 'md',
  message,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-b-3',
  };

  const spinner = (
    <div
      className={`
        animate-spin rounded-full
        ${sizeClasses[size]}
        border-theme-primary
      `}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div
        className={`
          min-h-screen
          flex items-center justify-center
          bg-theme-bg-page
          transition-colors duration-200
          ${className}
        `}
      >
        <div className="text-center">
          <div className="mx-auto">{spinner}</div>
          {message && (
            <p className="mt-4 text-theme-text-secondary font-medium">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {spinner}
      {message && (
        <p className="ml-3 text-theme-text-secondary font-medium">{message}</p>
      )}
    </div>
  );
}
