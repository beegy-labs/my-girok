import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Clock, Eye, MousePointer2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Card } from '../../../components/atoms/Card';
import { Badge } from '../../../components/atoms/Badge';
import { LocationBadge } from '../../system/session-recordings/components/LocationBadge';
import type { UserSessionSummary } from '../../../api/analytics';

interface UserSessionsListProps {
  sessions: UserSessionSummary[];
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function getDeviceIcon(type: string) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="w-4 h-4" />;
    case 'tablet':
      return <Tablet className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'recording':
      return 'info';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

export const UserSessionsList = memo<UserSessionsListProps>(({ sessions, loading = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-theme-text-tertiary">
          {t('analytics.noSessions', 'No sessions found')}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-theme-bg-secondary border-b border-theme-border-default">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-secondary uppercase tracking-wider">
                {t('analytics.session', 'Session')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-secondary uppercase tracking-wider">
                {t('analytics.device', 'Device')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-secondary uppercase tracking-wider">
                {t('analytics.location', 'Location')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-secondary uppercase tracking-wider">
                {t('analytics.activity', 'Activity')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-secondary uppercase tracking-wider">
                {t('common.status', 'Status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-default">
            {sessions.map((session) => (
              <tr
                key={session.sessionId}
                onClick={() => navigate(`/system/session-recordings/${session.sessionId}`)}
                className="hover:bg-theme-bg-secondary cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="text-sm text-theme-text-primary">
                    {formatDate(session.startedAt)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-theme-text-tertiary">
                    <Clock className="w-3 h-3" />
                    {formatDuration(session.durationSeconds)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(session.deviceType)}
                    <div>
                      <div className="text-sm text-theme-text-primary">{session.browser}</div>
                      <div className="text-xs text-theme-text-tertiary capitalize">
                        {session.deviceType}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <LocationBadge countryCode={session.countryCode} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-theme-text-secondary">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {session.pageViews}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointer2 className="w-3 h-3" />
                      {session.clicks}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(session.status)}>{session.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

UserSessionsList.displayName = 'UserSessionsList';
