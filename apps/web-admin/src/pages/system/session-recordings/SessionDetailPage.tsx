import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  User,
  Calendar,
  MousePointer2,
  Eye,
  Loader2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { recordingsApi, type SessionRecordingEvents } from '../../../api/recordings';
import { useApiError } from '../../../hooks/useApiError';

// TODO: Replace with @my-girok/tracking-sdk/react when available
const SessionPlayer = ({ events }: { events: any }) => (
  <div className="p-8 bg-theme-background-secondary rounded-lg text-center text-theme-text-secondary">
    Session Player (Coming Soon)
    <br />
    <span className="text-sm">{events?.length || 0} events recorded</span>
  </div>
);

import { LocationBadge } from './components/LocationBadge';
import { EventTimeline } from './components/EventTimeline';
import { Card } from '../../../components/atoms/Card';
import { Badge } from '../../../components/atoms/Badge';

// Pure helper functions moved outside component for better performance
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
      return <Smartphone className="w-5 h-5" />;
    case 'tablet':
      return <Tablet className="w-5 h-5" />;
    default:
      return <Monitor className="w-5 h-5" />;
  }
}

function getStatusVariant(status: string): 'success' | 'info' | 'error' | 'default' {
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

export default function SessionDetailPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionRecordingEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { executeWithErrorHandling } = useApiError({
    context: 'SessionDetailPage.fetchSession',
    retry: true,
  });

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    const sessionData = await executeWithErrorHandling(async () => {
      return await recordingsApi.getSessionEvents(sessionId);
    });
    if (sessionData) {
      setSession(sessionData);
      setError(null);
    } else {
      setError(t('sessionRecordings.notFound', 'Session not found'));
    }
    setLoading(false);
  }, [sessionId, executeWithErrorHandling, t]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error || t('sessionRecordings.notFound', 'Session not found')}</span>
        </div>
      </div>
    );
  }

  const { metadata, events } = session;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/system/session-recordings"
          className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {t('sessionRecordings.sessionDetail', 'Session Detail')}
          </h1>
          <p className="text-sm text-theme-text-tertiary">
            {t('sessionRecordings.sessionId', 'Session ID')}: {metadata.sessionId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Session Player */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="none">
            <div className="bg-gray-900 flex items-center justify-center p-4">
              <SessionPlayer events={events as never[]} />
            </div>
          </Card>

          {/* Event Timeline */}
          <Card>
            <EventTimeline events={events} startTime={new Date(metadata.startedAt).getTime()} />
          </Card>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-6">
          {/* Status & Device Info */}
          <Card>
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
              {t('sessionRecordings.overview', 'Overview')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-text-secondary">
                  {t('common.status', 'Status')}
                </span>
                <Badge variant={getStatusVariant(metadata.status)}>{metadata.status}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-text-secondary">
                  {t('sessionRecordings.device', 'Device')}
                </span>
                <div className="flex items-center gap-2 text-theme-text-primary">
                  {getDeviceIcon(metadata.deviceType)}
                  <span className="text-sm capitalize">{metadata.deviceType}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-text-secondary">
                  {t('sessionRecordings.browser', 'Browser')}
                </span>
                <span className="text-sm text-theme-text-primary">
                  {metadata.browser} / {metadata.os}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-text-secondary">
                  {t('sessionRecordings.location', 'Location')}
                </span>
                <LocationBadge countryCode={metadata.countryCode} />
              </div>
            </div>
          </Card>

          {/* User Info */}
          <Card>
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
              {t('sessionRecordings.userInfo', 'User Information')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-theme-text-tertiary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-theme-text-secondary mb-1">
                    {t('common.email', 'Email')}
                  </div>
                  <div className="text-sm text-theme-text-primary break-all">
                    {metadata.actorEmail || t('common.anonymous', 'Anonymous')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-theme-text-tertiary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-theme-text-secondary mb-1">
                    {t('sessionRecordings.service', 'Service')}
                  </div>
                  <div className="text-sm text-theme-text-primary">{metadata.serviceSlug}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Session Timing */}
          <Card>
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
              {t('sessionRecordings.timing', 'Timing')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-theme-text-tertiary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-theme-text-secondary mb-1">
                    {t('sessionRecordings.startedAt', 'Started At')}
                  </div>
                  <div className="text-sm text-theme-text-primary">
                    {formatDate(metadata.startedAt)}
                  </div>
                </div>
              </div>

              {metadata.endedAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-theme-text-tertiary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-theme-text-secondary mb-1">
                      {t('sessionRecordings.endedAt', 'Ended At')}
                    </div>
                    <div className="text-sm text-theme-text-primary">
                      {formatDate(metadata.endedAt)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-theme-text-tertiary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-theme-text-secondary mb-1">
                    {t('sessionRecordings.duration', 'Duration')}
                  </div>
                  <div className="text-sm text-theme-text-primary">
                    {formatDuration(metadata.durationSeconds)}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Activity Stats */}
          <Card>
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
              {t('sessionRecordings.activity', 'Activity')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-theme-text-secondary">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{t('sessionRecordings.pageViews', 'Page Views')}</span>
                </div>
                <span className="text-lg font-semibold text-theme-text-primary">
                  {metadata.pageViews}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-theme-text-secondary">
                  <MousePointer2 className="w-4 h-4" />
                  <span className="text-sm">{t('sessionRecordings.clicks', 'Clicks')}</span>
                </div>
                <span className="text-lg font-semibold text-theme-text-primary">
                  {metadata.clicks}
                </span>
              </div>

              <div className="pt-3 border-t border-theme-border-default">
                <div className="text-xs text-theme-text-tertiary mb-2">
                  {t('sessionRecordings.entryPage', 'Entry Page')}
                </div>
                <div className="text-sm text-theme-text-primary break-all">
                  {metadata.entryPage}
                </div>
              </div>

              {metadata.exitPage && (
                <div className="pt-3 border-t border-theme-border-default">
                  <div className="text-xs text-theme-text-tertiary mb-2">
                    {t('sessionRecordings.exitPage', 'Exit Page')}
                  </div>
                  <div className="text-sm text-theme-text-primary break-all">
                    {metadata.exitPage}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
