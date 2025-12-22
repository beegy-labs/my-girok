import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { focusClasses } from '@my-girok/ui-components';
import { Bell } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  status: 'NEW' | 'UPDATE' | 'NOTICE';
  start: string;
  end: string;
  read: boolean;
}

// Initial announcements data (would come from API in real implementation)
const INITIAL_ANNOUNCEMENTS: Notification[] = [
  {
    id: 1,
    title: 'Security update and server optimization complete',
    status: 'NEW',
    start: '2024-01-01',
    end: '2025-12-31',
    read: false,
  },
  {
    id: 2,
    title: 'Journal theme customization feature added',
    status: 'UPDATE',
    start: '2024-01-01',
    end: '2025-12-31',
    read: false,
  },
  {
    id: 3,
    title: 'Data backup and sync notice',
    status: 'NOTICE',
    start: '2024-01-01',
    end: '2025-06-30',
    read: false,
  },
  {
    id: 4,
    title: 'Archive v25.8 update complete',
    status: 'NOTICE',
    start: '2025-01-01',
    end: '2025-12-31',
    read: false,
  },
];

/**
 * NotificationButton - Simple notification link with count badge
 * Navigates to /notices page on click
 */
export default function NotificationButton() {
  const { t } = useTranslation();

  // Count unread notifications
  const unreadCount = useMemo(() => INITIAL_ANNOUNCEMENTS.filter((n) => !n.read).length, []);

  return (
    <Link
      to="/notices"
      aria-label={t('aria.notifications', {
        defaultValue: `Notifications (${unreadCount} unread)`,
        count: unreadCount,
      })}
      className={`relative p-3 rounded-soft hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${focusClasses}`}
    >
      <Bell size={22} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-theme-primary text-white text-[11px] font-black rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
