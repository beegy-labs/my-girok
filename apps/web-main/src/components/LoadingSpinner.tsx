import { useTranslation } from 'react-i18next';
import { CharacterLoader } from './characters';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
  className?: string;
}

/**
 * LoadingSpinner - Reusable loading component with theme-aware character
 *
 * Usage:
 * <LoadingSpinner />
 * <LoadingSpinner message="Custom loading message" />
 * <LoadingSpinner fullScreen />
 */
export default function LoadingSpinner({
  message,
  size = 120,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains('dark');

  const defaultMessage = isDark
    ? t('loading.darkMode')
    : t('loading.lightMode');

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <CharacterLoader state="loading" size={size} />
      <p className="mt-6 text-base font-medium text-theme-text-secondary">
        {message || defaultMessage}
      </p>
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
