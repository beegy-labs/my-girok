import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, ChevronLeft, ChevronRight, Eye, X, Filter } from 'lucide-react';
import {
  auditApi,
  type AuditLogResponse,
  type AuditLogListQuery,
  type AuditLogFilterOptions,
} from '../api/audit';
import { logger } from '../utils/logger';

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [filterOptions, setFilterOptions] = useState<AuditLogFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [filters, setFilters] = useState<AuditLogListQuery>({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auditApi.listLogs({ ...filters, page, limit });
      setLogs(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (err) {
      setError(t('common.error'));
      logger.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const options = await auditApi.getFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      logger.error('Failed to fetch filter options', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await auditApi.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Failed to export audit logs', err);
    }
  }, [filters]);

  const handleFilterChange = useCallback((key: keyof AuditLogListQuery, value: string) => {
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
    return new Date(dateStr).toLocaleString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getActionColor = useCallback((action: string) => {
    if (action.includes('create'))
      return 'bg-theme-status-success-bg text-theme-status-success-text';
    if (action.includes('update')) return 'bg-theme-status-info-bg text-theme-status-info-text';
    if (action.includes('delete')) return 'bg-theme-status-error-bg text-theme-status-error-text';
    if (action.includes('login')) return 'bg-theme-level-3-bg text-theme-level-3-text';
    return 'bg-theme-bg-secondary text-theme-text-secondary';
  }, []);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-theme-primary" size={32} />
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-theme-status-error-text">{error}</p>
        <button
          onClick={fetchLogs}
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
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('audit.title')}</h1>
          <p className="text-theme-text-secondary mt-1">{t('audit.subtitle', { total })}</p>
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

          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
          >
            <Download size={18} />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('audit.action')}
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
              >
                <option value="">{t('common.all')}</option>
                {filterOptions?.actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('audit.resource')}
              </label>
              <select
                value={filters.resource || ''}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
              >
                <option value="">{t('common.all')}</option>
                {filterOptions?.resources.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('audit.actor')}
              </label>
              <select
                value={filters.actorId || ''}
                onChange={(e) => handleFilterChange('actorId', e.target.value)}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
              >
                <option value="">{t('common.all')}</option>
                {filterOptions?.admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.displayName || admin.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  {t('audit.startDate')}
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
                  {t('audit.endDate')}
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
                  {t('audit.date')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('audit.actor')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('audit.action')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('audit.resource')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  {t('audit.ipAddress')}
                </th>
                <th className="text-center px-4 py-3 font-medium text-theme-text-secondary">
                  {t('audit.details')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-theme-bg-secondary/50">
                  <td className="px-4 py-3 text-theme-text-primary whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-theme-text-primary">{log.actorEmail}</p>
                      <p className="text-xs text-theme-text-tertiary">{log.actorType}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-theme-text-primary">{log.resource}</p>
                    {log.targetId && (
                      <p className="text-xs text-theme-text-tertiary font-mono truncate max-w-[150px]">
                        {log.targetId}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-theme-text-secondary font-mono text-xs">
                    {log.ipAddress || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
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
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-theme-bg-card border border-theme-border-default rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-theme-border-default">
              <h3 className="text-lg font-semibold text-theme-text-primary">
                {t('audit.logDetail')}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Meta Info */}
              <div className="p-3 bg-theme-bg-secondary rounded-lg">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-theme-text-tertiary">{t('audit.actor')}:</dt>
                  <dd className="text-theme-text-primary">{selectedLog.actorEmail}</dd>
                  <dt className="text-theme-text-tertiary">{t('audit.actorType')}:</dt>
                  <dd className="text-theme-text-primary">{selectedLog.actorType}</dd>
                  <dt className="text-theme-text-tertiary">{t('audit.action')}:</dt>
                  <dd className="text-theme-text-primary">{selectedLog.action}</dd>
                  <dt className="text-theme-text-tertiary">{t('audit.resource')}:</dt>
                  <dd className="text-theme-text-primary">{selectedLog.resource}</dd>
                  <dt className="text-theme-text-tertiary">{t('audit.targetId')}:</dt>
                  <dd className="text-theme-text-primary font-mono text-xs">
                    {selectedLog.targetId || '-'}
                  </dd>
                  <dt className="text-theme-text-tertiary">{t('audit.method')}:</dt>
                  <dd className="text-theme-text-primary">{selectedLog.method}</dd>
                  <dt className="text-theme-text-tertiary">{t('audit.path')}:</dt>
                  <dd className="text-theme-text-primary font-mono text-xs truncate">
                    {selectedLog.path}
                  </dd>
                  <dt className="text-theme-text-tertiary">{t('audit.statusCode')}:</dt>
                  <dd className="text-theme-text-primary">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        selectedLog.success
                          ? 'bg-theme-status-success-bg text-theme-status-success-text'
                          : 'bg-theme-status-error-bg text-theme-status-error-text'
                      }`}
                    >
                      {selectedLog.statusCode}
                    </span>
                  </dd>
                  <dt className="text-theme-text-tertiary">{t('audit.ipAddress')}:</dt>
                  <dd className="text-theme-text-primary font-mono">{selectedLog.ipAddress}</dd>
                  <dt className="text-theme-text-tertiary">{t('audit.duration')}:</dt>
                  <dd className="text-theme-text-primary">{selectedLog.durationMs}ms</dd>
                  {selectedLog.serviceSlug && (
                    <>
                      <dt className="text-theme-text-tertiary">{t('audit.service')}:</dt>
                      <dd className="text-theme-text-primary">{selectedLog.serviceSlug}</dd>
                    </>
                  )}
                  {selectedLog.errorMessage && (
                    <>
                      <dt className="text-theme-text-tertiary">{t('audit.errorMessage')}:</dt>
                      <dd className="text-theme-status-error-text">{selectedLog.errorMessage}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
