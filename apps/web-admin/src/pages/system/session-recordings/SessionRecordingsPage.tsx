import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Play,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import {
  recordingsApi,
  type SessionRecordingMetadata,
  type SessionRecordingEvents,
} from '../../../api/recordings';
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
      return <Smartphone className="w-4 h-4" />;
    case 'tablet':
      return <Tablet className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'recording':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

export default function SessionRecordingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRecordingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [deviceType, setDeviceType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Replay modal
  const [selectedSession, setSelectedSession] = useState<SessionRecordingEvents | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const { executeWithErrorHandling } = useApiError({
    context: 'SessionRecordingsPage.fetchSessions',
    retry: true,
  });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const response = await executeWithErrorHandling(async () => {
      return await recordingsApi.listSessions({
        deviceType: deviceType as 'desktop' | 'mobile' | 'tablet' | undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });
    });
    if (response) {
      setSessions(response.data);
      setTotal(response.total);
    }
    setLoading(false);
  }, [deviceType, startDate, endDate, page, limit, executeWithErrorHandling]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleViewSession = async (sessionId: string) => {
    setLoadingSession(true);
    const sessionData = await executeWithErrorHandling(async () => {
      return await recordingsApi.getSessionEvents(sessionId);
    });
    if (sessionData) {
      setSelectedSession(sessionData);
    }
    setLoadingSession(false);
  };

  const handleViewDetail = (sessionId: string) => {
    navigate(`/system/session-recordings/${sessionId}`);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('sessionRecordings.title', '세션 녹화')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('sessionRecordings.subtitle', '총 {{total}}개 세션', { total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border
              ${
                showFilters
                  ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
          >
            <Filter className="w-4 h-4" />
            {t('common.filter', '필터')}
          </button>
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh', '새로고침')}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('sessionRecordings.deviceType', '기기 유형')}
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">{t('common.all', '전체')}</option>
                <option value="desktop">{t('sessionRecordings.desktop', '데스크탑')}</option>
                <option value="mobile">{t('sessionRecordings.mobile', '모바일')}</option>
                <option value="tablet">{t('sessionRecordings.tablet', '태블릿')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.startDate', '시작일')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.endDate', '종료일')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('sessionRecordings.noSessions', '녹화된 세션이 없습니다')}
        </div>
      ) : (
        <>
          {/* Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetail(session.sessionId)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(session.deviceType)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.browser} / {session.os}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(session.durationSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="truncate">
                      {session.actorEmail || t('common.anonymous', '익명')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LocationBadge countryCode={session.countryCode} />
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(session.startedAt)}</div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-gray-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {session.pageViews}
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {session.clicks}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSession(session.sessionId);
                    }}
                    disabled={loadingSession}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    {t('sessionRecordings.replay', '재생')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Replay Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('sessionRecordings.sessionReplay', '세션 재생')}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedSession.metadata.actorEmail || t('common.anonymous', '익명')} ·{' '}
                  {formatDate(selectedSession.metadata.startedAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-gray-900">
              <SessionPlayer events={selectedSession.events as never[]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
