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

const MESSAGE_CONFIG: Record<MessageType, {
  state: CharacterState;
  defaultTitle: {
    light: string;
    dark: string;
  };
  defaultMessage: {
    light: string;
    dark: string;
  };
}> = {
  loading: {
    state: 'loading',
    defaultTitle: {
      light: '기록을 찾고 있어요',
      dark: '고요한 밤에 기록을 찾는 중이에요',
    },
    defaultMessage: {
      light: '잠시만 기다려주세요...',
      dark: '달빛 아래 책장을 살펴보는 중이에요...',
    },
  },
  'not-found': {
    state: 'confused',
    defaultTitle: {
      light: '기록을 찾을 수 없어요',
      dark: '이 기록은 밤의 도서관에 없어요',
    },
    defaultMessage: {
      light: '요청하신 페이지를 찾을 수 없습니다',
      dark: '어둠 속에서도 찾을 수 없는 기록이에요',
    },
  },
  error: {
    state: 'sad',
    defaultTitle: {
      light: '앗, 문제가 생겼어요',
      dark: '달빛이 흐려졌어요',
    },
    defaultMessage: {
      light: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
      dark: '밤하늘에 구름이 끼었어요. 잠시 후 다시 시도해주세요',
    },
  },
  expired: {
    state: 'sleeping',
    defaultTitle: {
      light: '공유 기간이 만료되었어요',
      dark: '밤이 깊어 잠들었어요',
    },
    defaultMessage: {
      light: '이 공유 링크는 더 이상 유효하지 않습니다',
      dark: '달이 지고 링크가 잠들었어요',
    },
  },
  deleted: {
    state: 'sad',
    defaultTitle: {
      light: '삭제된 기록이에요',
      dark: '어둠 속으로 사라진 기록이에요',
    },
    defaultMessage: {
      light: '이 기록은 소유자에 의해 삭제되었습니다',
      dark: '밤의 안개 속으로 사라진 기록입니다',
    },
  },
  'no-permission': {
    state: 'confused',
    defaultTitle: {
      light: '접근 권한이 없어요',
      dark: '이 서재는 잠겨있어요',
    },
    defaultMessage: {
      light: '이 기록을 볼 수 있는 권한이 없습니다',
      dark: '달빛도 비추지 못하는 비밀 서재예요',
    },
  },
  maintenance: {
    state: 'sleeping',
    defaultTitle: {
      light: '잠시 휴식 중이에요',
      dark: '도서관이 밤의 정비 중이에요',
    },
    defaultMessage: {
      light: '시스템 점검 중입니다. 잠시만 기다려주세요',
      dark: '별빛 아래 도서관을 정리하고 있어요',
    },
  },
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
  const config = MESSAGE_CONFIG[type];

  // Determine theme for message text (we'll use a simple check)
  const isDark = document.documentElement.classList.contains('dark');
  const themeKey = isDark ? 'dark' : 'light';

  const displayTitle = title || config.defaultTitle[themeKey];
  const displayMessage = message || config.defaultMessage[themeKey];

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {/* Character */}
      <CharacterLoader state={config.state} size={size} className="mb-6" />

      {/* Title */}
      <h2 className="text-2xl font-bold text-amber-900 dark:text-dark-text-primary mb-3">
        {displayTitle}
      </h2>

      {/* Message */}
      <p className="text-base text-gray-700 dark:text-dark-text-secondary max-w-md mb-6">
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
