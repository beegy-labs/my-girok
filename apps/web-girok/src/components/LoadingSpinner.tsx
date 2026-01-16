import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

/**
 * LoadingSpinner - WCAG-compliant loading component
 *
 * Features:
 * - Accessible with aria-live for screen readers
 * - Simple, professional design without mascots
 * - Lucide-React icon for consistency
 *
 * Usage:
 * <LoadingSpinner />
 * <LoadingSpinner message="Custom loading message" />
 * <LoadingSpinner fullScreen />
 */
export default function LoadingSpinner({
  message,
  size = 'md',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const { t } = useTranslation();

  const defaultMessage = t('common.loading');

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={`${sizeClasses[size]} text-theme-primary animate-spin`}
        aria-hidden="true"
      />
      <p className="text-base font-medium text-theme-text-secondary">{message || defaultMessage}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-theme-bg-page z-50">
        {content}
      </div>
    );
  }

  return content;
}
