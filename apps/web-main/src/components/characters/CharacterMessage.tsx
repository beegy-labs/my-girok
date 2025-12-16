import { useTranslation } from 'react-i18next';
import CharacterLoader, { CharacterState } from './CharacterLoader';

export type MessageType =
  | 'loading'
  | 'not-found'
  | 'error'
  | 'expired'
  | 'deleted'
  | 'no-permission'
  | 'maintenance';

interface CharacterMessageProps {
  type: MessageType;
  title?: string;
  message?: string;
  size?: number;
  className?: string;
  action?: React.ReactNode;
}

const MESSAGE_STATE_MAP: Record<MessageType, CharacterState> = {
  loading: 'loading',
  'not-found': 'confused',
  error: 'sad',
  expired: 'sleeping',
  deleted: 'sad',
  'no-permission': 'confused',
  maintenance: 'sleeping',
};

// Map MessageType to translation key (kebab-case to camelCase)
const getTranslationKey = (type: MessageType): string => {
  const keyMap: Record<MessageType, string> = {
    loading: 'loading',
    'not-found': 'notFound',
    error: 'error',
    expired: 'expired',
    deleted: 'deleted',
    'no-permission': 'noPermission',
    maintenance: 'maintenance',
  };
  return keyMap[type];
};

/**
 * CharacterMessage - Complete message component with character and text
 *
 * Usage:
 * <CharacterMessage type="loading" />
 * <CharacterMessage type="not-found" title="Custom title" />
 * <CharacterMessage type="error" action={<Button>Retry</Button>} />
 */
export default function CharacterMessage({
  type,
  title,
  message,
  size = 120,
  className = '',
  action,
}: CharacterMessageProps) {
  const { t } = useTranslation();
  const translationKey = getTranslationKey(type);
  const characterState = MESSAGE_STATE_MAP[type];

  // Determine theme for message text
  const isDark = document.documentElement.classList.contains('dark');
  const themeKey = isDark ? 'dark' : 'light';

  const displayTitle = title || t(`character.${translationKey}.${themeKey}`);
  const displayMessage = message || t(`character.${translationKey}.message${themeKey === 'light' ? 'Light' : 'Dark'}`);

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {/* Character */}
      <CharacterLoader state={characterState} size={size} className="mb-6" />

      {/* Title */}
      <h2 className="text-2xl font-bold text-vintage-text-primary dark:text-dark-text-primary mb-3">
        {displayTitle}
      </h2>

      {/* Message */}
      <p className="text-base text-vintage-text-secondary dark:text-dark-text-secondary max-w-md mb-6">
        {displayMessage}
      </p>

      {/* Action button (if provided) */}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
