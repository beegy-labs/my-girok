import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  analyticsApi,
  type UserSummary,
  type UserSessionSummary,
  type UserLocationStats,
} from '../../api/analytics';
import { UserSummaryCard } from './components/UserSummaryCard';
import { UserSessionsList } from './components/UserSessionsList';
import { UserLocationStats as UserLocationStatsComponent } from './components/UserLocationStats';
import { useApiError } from '../../hooks/useApiError';

export default function UserActivityPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [sessions, setSessions] = useState<UserSessionSummary[]>([]);
  const [locations, setLocations] = useState<UserLocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const { executeWithErrorHandling } = useApiError({
    context: 'UserActivityPage.fetchData',
    retry: true,
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const result = await executeWithErrorHandling(async () => {
      const [summaryData, sessionsData, locationsData] = await Promise.all([
        analyticsApi.getUserSummary(userId),
        analyticsApi.getUserSessions(userId, { page, limit }),
        analyticsApi.getUserLocations(userId),
      ]);
      return { summaryData, sessionsData, locationsData };
    });

    if (result) {
      setSummary(result.summaryData);
      setSessions(result.sessionsData.data);
      setTotal(result.sessionsData.total);
      setLocations(result.locationsData);
      setError(null);
    } else {
      setError(t('analytics.userNotFound', 'User not found'));
    }
    setLoading(false);
  }, [userId, page, limit, executeWithErrorHandling, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error || t('analytics.userNotFound', 'User not found')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/users" className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-theme-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {t('analytics.userActivity', 'User Activity')}
          </h1>
          <p className="text-sm text-theme-text-tertiary">
            {t('analytics.userActivitySubtitle', 'Detailed activity and session history')}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <UserSummaryCard summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">
            {t('analytics.sessions', 'Sessions')} ({total})
          </h2>
          <UserSessionsList sessions={sessions} loading={loading && !!summary} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-theme-border-default disabled:opacity-50 hover:bg-theme-bg-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm text-theme-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-theme-border-default disabled:opacity-50 hover:bg-theme-bg-secondary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Location Stats */}
        <div>
          <UserLocationStatsComponent locations={locations} loading={loading && !!summary} />
        </div>
      </div>
    </div>
  );
}
