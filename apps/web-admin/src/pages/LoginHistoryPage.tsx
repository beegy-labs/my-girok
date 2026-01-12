import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ChevronLeft, ChevronRight, Eye, X, Filter } from 'lucide-react';
import { auditApi, type LoginHistoryEvent, type LoginHistoryQuery } from '../api/audit';
import { logger } from '../utils/logger';

export default function LoginHistoryPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<LoginHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LoginHistoryEvent | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [filters, setFilters] = useState<LoginHistoryQuery>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auditApi.getLoginHistory({ ...filters, page, limit });
      setEvents(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(t('loginHistory.loadFailed'));
      logger.error('Failed to fetch login history', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterChange = useCallback((key: keyof LoginHistoryQuery, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  const getEventTypeColor = useCallback((eventType: string) => {
    if (eventType.includes('SUCCESS') || eventType === 'LOGIN_SUCCESS')
      return 'bg-theme-status-success-bg text-theme-status-success-text';
    if (eventType.includes('FAILED') || eventType === 'LOGIN_FAILED' || eventType === 'MFA_FAILED')
      return 'bg-theme-status-error-bg text-theme-status-error-text';
    if (eventType.includes('BLOCKED') || eventType === 'LOGIN_BLOCKED')
      return 'bg-theme-status-warning-bg text-theme-status-warning-text';
    if (eventType === 'LOGOUT' || eventType.includes('REVOKED'))
      return 'bg-theme-level-3-bg text-theme-level-3-text';
    return 'bg-theme-bg-secondary text-theme-text-secondary';
  }, []);

  const getResultColor = useCallback((result: string) => {
    if (result === 'SUCCESS') return 'bg-theme-status-success-bg text-theme-status-success-text';
    if (result === 'FAILURE') return 'bg-theme-status-error-bg text-theme-status-error-text';
    if (result === 'BLOCKED') return 'bg-theme-status-warning-bg text-theme-status-warning-text';
    return 'bg-theme-bg-secondary text-theme-text-secondary';
  }, []);

  const getEventTypeLabel = useCallback(
    (eventType: string) => {
      const labels: Record<string, string> = {
        LOGIN_SUCCESS: t('loginHistory.eventTypes.loginSuccess'),
        LOGIN_FAILED: t('loginHistory.eventTypes.loginFailed'),
        LOGIN_BLOCKED: t('loginHistory.eventTypes.loginBlocked'),
        LOGOUT: t('loginHistory.eventTypes.logout'),
        SESSION_EXPIRED: t('loginHistory.eventTypes.sessionExpired'),
        SESSION_REVOKED: t('loginHistory.eventTypes.sessionRevoked'),
        MFA_SETUP: t('loginHistory.eventTypes.mfaSetup'),
        MFA_VERIFIED: t('loginHistory.eventTypes.mfaVerified'),
        MFA_FAILED: t('loginHistory.eventTypes.mfaFailed'),
        MFA_DISABLED: t('loginHistory.eventTypes.mfaDisabled'),
        PASSWORD_CHANGED: t('loginHistory.eventTypes.passwordChanged'),
        PASSWORD_RESET: t('loginHistory.eventTypes.passwordReset'),
        TOKEN_REFRESHED: t('loginHistory.eventTypes.tokenRefreshed'),
        TOKEN_REVOKED: t('loginHistory.eventTypes.tokenRevoked'),
      };
      return labels[eventType] || eventType;
    },
    [t],
  );

  const getAccountTypeLabel = useCallback(
    (accountType: string) => {
      const labels: Record<string, string> = {
        USER: t('loginHistory.accountTypes.user'),
        OPERATOR: t('loginHistory.accountTypes.operator'),
        ADMIN: t('loginHistory.accountTypes.admin'),
      };
      return labels[accountType] || accountType;
    },
    [t],
  );

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-theme-primary" size={32} />
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-theme-status-error-text">{error}</p>
        <button
          onClick={fetchEvents}
          className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors"
        >
          {t('common.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('loginHistory.title')}</h1>
          <p className="text-theme-text-secondary mt-1">{t('loginHistory.subtitle', { total })}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                : 'border-theme-border-default text-theme-text-secondary hover:bg-theme-bg-secondary'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">{t('common.filter')}</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-theme-primary text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Refresh button */}
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Type Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('loginHistory.accountType')}
              </label>
              <select
                value={filters.accountType || ''}
                onChange={(e) => handleFilterChange('accountType', e.target.value)}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
              >
                <option value="">{t('common.all')}</option>
                <option value="USER">{t('loginHistory.accountTypes.user')}</option>
                <option value="OPERATOR">{t('loginHistory.accountTypes.operator')}</option>
                <option value="ADMIN">{t('loginHistory.accountTypes.admin')}</option>
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('loginHistory.eventType')}
              </label>
              <select
                value={filters.eventType || ''}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
              >
                <option value="">{t('common.all')}</option>
                <option value="LOGIN_SUCCESS">{t('loginHistory.eventTypes.loginSuccess')}</option>
                <option value="LOGIN_FAILED">{t('loginHistory.eventTypes.loginFailed')}</option>
                <option value="LOGIN_BLOCKED">{t('loginHistory.eventTypes.loginBlocked')}</option>
                <option value="LOGOUT">{t('loginHistory.eventTypes.logout')}</option>
                <option value="MFA_VERIFIED">{t('loginHistory.eventTypes.mfaVerified')}</option>
                <option value="MFA_FAILED">{t('loginHistory.eventTypes.mfaFailed')}</option>
              </select>
            </div>

            {/* Result Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('loginHistory.result')}
              </label>
              <select
                value={filters.result || ''}
                onChange={(e) => handleFilterChange('result', e.target.value)}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
              >
                <option value="">{t('common.all')}</option>
                <option value="SUCCESS">{t('loginHistory.results.success')}</option>
                <option value="FAILURE">{t('loginHistory.results.failure')}</option>
                <option value="BLOCKED">{t('loginHistory.results.blocked')}</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  {t('loginHistory.startDate')}
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  {t('loginHistory.endDate')}
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
                />
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button onClick={clearFilters} className="text-sm text-theme-primary hover:underline">
                {t('common.clearFilters')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-theme-bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.timestamp')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.accountType')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.eventType')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.result')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.ipAddress')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.country')}
                </th>
                <th className="text-center px-4 py-3 font-medium text-theme-text-secondary">
                  {t('loginHistory.details')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-theme-text-tertiary">
                    {t('loginHistory.noEvents')}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-theme-bg-secondary/50">
                    <td className="px-4 py-3 text-theme-text-primary whitespace-nowrap">
                      {formatDate(event.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-theme-bg-secondary text-theme-text-secondary">
                        {getAccountTypeLabel(event.accountType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getEventTypeColor(event.eventType)}`}
                      >
                        {getEventTypeLabel(event.eventType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getResultColor(event.result)}`}
                      >
                        {t(`loginHistory.results.${event.result.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-theme-text-secondary font-mono text-xs">
                      {event.ipAddress || '-'}
                    </td>
                    <td className="px-4 py-3 text-theme-text-secondary">
                      {event.countryCode || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-theme-border-default">
            <p className="text-sm text-theme-text-secondary">
              {t('common.showing', {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm text-theme-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-theme-bg-card border border-theme-border-default rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-theme-border-default">
              <h3 className="text-lg font-semibold text-theme-text-primary">
                {t('loginHistory.eventDetail')}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Meta Info */}
              <div className="p-3 bg-theme-bg-secondary rounded-lg">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-theme-text-tertiary">{t('loginHistory.eventId')}:</dt>
                  <dd className="text-theme-text-primary font-mono text-xs">{selectedEvent.id}</dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.timestamp')}:</dt>
                  <dd className="text-theme-text-primary">{formatDate(selectedEvent.timestamp)}</dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.accountType')}:</dt>
                  <dd className="text-theme-text-primary">
                    {getAccountTypeLabel(selectedEvent.accountType)}
                  </dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.accountId')}:</dt>
                  <dd className="text-theme-text-primary font-mono text-xs">
                    {selectedEvent.accountId}
                  </dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.eventType')}:</dt>
                  <dd className="text-theme-text-primary">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getEventTypeColor(selectedEvent.eventType)}`}
                    >
                      {getEventTypeLabel(selectedEvent.eventType)}
                    </span>
                  </dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.result')}:</dt>
                  <dd className="text-theme-text-primary">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getResultColor(selectedEvent.result)}`}
                    >
                      {t(`loginHistory.results.${selectedEvent.result.toLowerCase()}`)}
                    </span>
                  </dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.ipAddress')}:</dt>
                  <dd className="text-theme-text-primary font-mono">{selectedEvent.ipAddress}</dd>

                  <dt className="text-theme-text-tertiary">{t('loginHistory.country')}:</dt>
                  <dd className="text-theme-text-primary">{selectedEvent.countryCode || '-'}</dd>

                  {selectedEvent.sessionId && (
                    <>
                      <dt className="text-theme-text-tertiary">{t('loginHistory.sessionId')}:</dt>
                      <dd className="text-theme-text-primary font-mono text-xs">
                        {selectedEvent.sessionId}
                      </dd>
                    </>
                  )}

                  {selectedEvent.deviceFingerprint && (
                    <>
                      <dt className="text-theme-text-tertiary">
                        {t('loginHistory.deviceFingerprint')}:
                      </dt>
                      <dd className="text-theme-text-primary font-mono text-xs">
                        {selectedEvent.deviceFingerprint}
                      </dd>
                    </>
                  )}

                  {selectedEvent.failureReason && (
                    <>
                      <dt className="text-theme-text-tertiary">
                        {t('loginHistory.failureReason')}:
                      </dt>
                      <dd className="text-theme-status-error-text">
                        {selectedEvent.failureReason}
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              {/* User Agent */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-theme-text-secondary mb-2">
                  {t('loginHistory.userAgent')}
                </h4>
                <p className="p-3 bg-theme-bg-secondary rounded-lg text-xs text-theme-text-tertiary font-mono break-all">
                  {selectedEvent.userAgent}
                </p>
              </div>

              {/* Metadata */}
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-theme-text-secondary mb-2">
                    {t('loginHistory.metadata')}
                  </h4>
                  <pre className="p-3 bg-theme-bg-secondary rounded-lg text-xs text-theme-text-tertiary overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
