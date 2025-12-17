import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  FileQuestion,
  Clock,
  Lock,
  AlertTriangle,
  Wrench,
  Trash2,
  LucideIcon,
} from 'lucide-react';

type StatusType =
  | 'error'
  | 'not-found'
  | 'expired'
  | 'no-permission'
  | 'maintenance'
  | 'deleted'
  | 'warning';

interface StatusMessageProps {
  type: StatusType;
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  {
    icon: LucideIcon;
    titleKey: string;
    messageKey: string;
    iconColor: string;
    bgColor: string;
  }
> = {
  error: {
    icon: AlertCircle,
    titleKey: 'character.error.light',
    messageKey: 'character.error.messageLight',
    iconColor: 'text-theme-status-error-text',
    bgColor: 'bg-theme-status-error-bg',
  },
  'not-found': {
    icon: FileQuestion,
    titleKey: 'character.notFound.light',
    messageKey: 'character.notFound.messageLight',
    iconColor: 'text-theme-text-tertiary',
    bgColor: 'bg-theme-bg-hover',
  },
  expired: {
    icon: Clock,
    titleKey: 'character.expired.light',
    messageKey: 'character.expired.messageLight',
    iconColor: 'text-theme-status-warning-text',
    bgColor: 'bg-theme-status-warning-bg',
  },
  'no-permission': {
    icon: Lock,
    titleKey: 'character.noPermission.light',
    messageKey: 'character.noPermission.messageLight',
    iconColor: 'text-theme-text-tertiary',
    bgColor: 'bg-theme-bg-hover',
  },
  maintenance: {
    icon: Wrench,
    titleKey: 'character.maintenance.light',
    messageKey: 'character.maintenance.messageLight',
    iconColor: 'text-theme-primary',
    bgColor: 'bg-theme-primary/10',
  },
  deleted: {
    icon: Trash2,
    titleKey: 'character.deleted.light',
    messageKey: 'character.deleted.messageLight',
    iconColor: 'text-theme-status-error-text',
    bgColor: 'bg-theme-status-error-bg',
  },
  warning: {
    icon: AlertTriangle,
    titleKey: 'character.error.light',
    messageKey: 'character.error.messageLight',
    iconColor: 'text-theme-status-warning-text',
    bgColor: 'bg-theme-status-warning-bg',
  },
};

/**
 * StatusMessage - WCAG-compliant status/error message component
 *
 * Features:
 * - Accessible with proper ARIA roles
 * - Professional design without mascot characters
 * - Lucide-React icons for visual clarity
 * - Customizable title, message, and action buttons
 *
 * Usage:
 * <StatusMessage type="not-found" />
 * <StatusMessage type="error" title="Custom Title" message="Custom message" />
 * <StatusMessage type="expired" action={<Button>Go Back</Button>} />
 */
export default function StatusMessage({
  type,
  title,
  message,
  action,
  className = '',
}: StatusMessageProps) {
  const { t } = useTranslation();
  const config = statusConfig[type];
  const Icon = config.icon;

  const displayTitle = title || t(config.titleKey);
  const displayMessage = message || t(config.messageKey);

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[400px] p-8 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon Container */}
      <div
        className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center mb-6`}
      >
        <Icon className={`w-10 h-10 ${config.iconColor}`} aria-hidden="true" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-theme-text-primary mb-3 text-center">
        {displayTitle}
      </h2>

      {/* Message */}
      <p className="text-base text-theme-text-secondary text-center max-w-md mb-6">
        {displayMessage}
      </p>

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
