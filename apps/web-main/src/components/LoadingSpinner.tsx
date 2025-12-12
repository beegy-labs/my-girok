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
  const isDark = document.documentElement.classList.contains('dark');

  const defaultMessage = isDark
    ? '고요한 밤에 기록을 찾는 중이에요...'
    : '기록을 부지런히 찾고 있어요...';

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <CharacterLoader state="loading" size={size} />
      <p className="mt-6 text-base font-medium text-vintage-text-secondary dark:text-dark-text-secondary">
        {message || defaultMessage}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-vintage-bg-page dark:bg-dark-bg-primary z-50">
        {content}
      </div>
    );
  }

  return content;
}
