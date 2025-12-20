import { useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useClickOutside, focusClasses } from '@my-girok/ui-components';
import { Bell, X, CheckCircle2, Trash2 } from 'lucide-react';

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
 * NotificationButton - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant notification bell with dropdown panel
 */
export default function NotificationButton() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_ANNOUNCEMENTS);
  const panelRef = useRef<HTMLDivElement>(null);

  // Filter active notifications by date
  const activeNotifications = useMemo(() => {
    const now = new Date();
    return notifications.filter((n) => now >= new Date(n.start) && now <= new Date(n.end));
  }, [notifications]);

  // Count unread notifications
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Close panel handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle panel handler
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Mark notification as read (curried to avoid inline functions in map)
  const handleMarkAsRead = useCallback(
    (id: number) => () => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    [],
  );

  // Delete notification (curried to avoid inline functions in map)
  const handleDelete = useCallback(
    (id: number) => () => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [],
  );

  // Close on click outside
  useClickOutside(panelRef, isOpen, handleClose);

  // Get status badge styling
  const getStatusBadgeClass = useCallback((_status: Notification['status'], read: boolean) => {
    const baseClass = 'text-[11px] font-black uppercase px-3 py-1 rounded-xl border';
    if (read) {
      return `${baseClass} border-theme-border-default text-theme-text-secondary`;
    }
    return `${baseClass} border-theme-primary text-theme-primary`;
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('aria.notifications', {
          defaultValue: `Notifications (${unreadCount} unread)`,
          count: unreadCount,
        })}
        className={`p-3 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${focusClasses} ${
          isOpen
            ? 'bg-theme-bg-secondary text-theme-primary border border-theme-border-default'
            : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover'
        }`}
      >
        <Bell size={22} aria-hidden="true" />
        {unreadCount > 0 && (
          <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-theme-primary rounded-full border-2 border-theme-bg-card">
            <span className="sr-only">
              {t('aria.unreadNotifications', { defaultValue: 'Unread notifications' })}
            </span>
          </div>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-4 w-80 sm:w-[420px] bg-theme-bg-card border-2 border-theme-border-default rounded-editorial shadow-theme-lg overflow-hidden z-[100]"
          role="dialog"
          aria-modal="true"
          aria-label={t('aria.notificationCenter', { defaultValue: 'Notification Center' })}
        >
          {/* Header */}
          <div className="p-8 border-b border-theme-border-default bg-theme-bg-secondary/60 flex justify-between items-center">
            <h3 className="text-[14px] font-black uppercase tracking-brand text-theme-text-primary font-mono-brand">
              {t('notifications.alerts', { defaultValue: 'Alerts' })}{' '}
              <span className="ml-2 text-theme-primary">({notifications.length})</span>
            </h3>
            <button
              onClick={handleClose}
              className={`p-3 hover:bg-theme-border-default/30 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${focusClasses}`}
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[450px] overflow-y-auto" aria-live="polite">
            {activeNotifications.length > 0 ? (
              <div className="divide-y divide-theme-border-default">
                {activeNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-7 group transition-colors relative ${
                      notification.read ? 'bg-transparent' : 'bg-theme-primary/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <span className={getStatusBadgeClass(notification.status, notification.read)}>
                        {notification.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={handleMarkAsRead(notification.id)}
                            className={`p-2.5 text-theme-primary hover:bg-theme-primary/10 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${focusClasses}`}
                            aria-label={t('notifications.markAsRead', {
                              defaultValue: 'Mark as read',
                            })}
                          >
                            <CheckCircle2 size={18} aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={handleDelete(notification.id)}
                          className={`p-2.5 text-theme-status-error-text hover:bg-theme-status-error-bg rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${focusClasses}`}
                          aria-label={t('notifications.delete', {
                            defaultValue: 'Delete notification',
                          })}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <p
                      className={`text-[15px] font-bold leading-relaxed ${
                        notification.read ? 'text-theme-text-secondary' : 'text-theme-text-primary'
                      }`}
                    >
                      {notification.title}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-theme-text-secondary">
                <Bell size={48} strokeWidth={1} aria-hidden="true" />
                <p className="mt-6 text-[13px] font-black uppercase tracking-brand font-mono-brand">
                  {t('notifications.noAlerts', { defaultValue: 'No New Alerts' })}
                </p>
              </div>
            )}
          </div>

          {/* Footer - View All */}
          {notifications.length > 0 && (
            <Link
              to="/notices"
              onClick={handleClose}
              className={`block w-full p-6 text-[12px] font-black uppercase tracking-brand-sm text-theme-primary bg-theme-bg-secondary border-t border-theme-border-default hover:bg-theme-primary hover:text-theme-bg-card transition-all text-center min-h-[44px] ${focusClasses}`}
            >
              {t('notifications.viewAll', { defaultValue: 'View All' })}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
