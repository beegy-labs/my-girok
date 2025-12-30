import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import { Loader2, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { auditApi, type AuditLogResponse } from '../../api/audit';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Pagination } from '../../components/molecules/Pagination';
import { useAuditEvent } from '../../hooks';

interface ServiceAuditTabProps {
  serviceId: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  READ: 'bg-gray-100 text-gray-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-orange-100 text-orange-700',
};

export default function ServiceAuditTab({ serviceId }: ServiceAuditTabProps) {
  const { t } = useTranslation();
  const { trackSearch } = useAuditEvent();

  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);
  const limit = 20;

  // Filters
  const [action, setAction] = useState<string>('');
  const [resource, setResource] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Note: serviceId filter may need to be added to the audit API
      // For now, we filter by resource pattern that includes the serviceId
      const result = await auditApi.listLogs({
        page,
        limit,
        action: action || undefined,
        resource: resource || `service:${serviceId}`,
      });
      setLogs(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      setError(t('audit.loadFailed'));
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        logger.error('Failed to fetch audit logs', {
          serviceId,
          page,
          action,
          resource,
          error: err,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [serviceId, page, action, resource, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = useCallback(async () => {
    setPage(1);
    setLoading(true);
    setError(null);

    try {
      const result = await auditApi.listLogs({
        page: 1,
        limit,
        action: action || undefined,
        resource: resource || `service:${serviceId}`,
      });
      setLogs(result.data);
      setTotal(result.meta.total);
      // Track search AFTER getting results with correct count
      trackSearch(`action:${action} resource:${resource}`, result.meta.total);
    } catch (err) {
      setError(t('audit.loadFailed'));
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        logger.error('Failed to search audit logs', { serviceId, action, resource, error: err });
      }
    } finally {
      setLoading(false);
    }
  }, [serviceId, action, resource, limit, trackSearch, t]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-theme-text-primary">
            {t('services.auditLogs')}
          </h3>
          <p className="text-sm text-theme-text-secondary">{t('services.auditLogsDesc')}</p>
        </div>

        <div className="flex gap-2">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
          >
            <option value="">{t('audit.allActions')}</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="READ">READ</option>
          </select>
          <input
            type="text"
            placeholder={t('audit.resourcePlaceholder')}
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
          />
          <Button onClick={handleSearch} icon={RefreshCw} variant="secondary">
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-theme-text-secondary">{t('audit.noLogs')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                    {t('audit.timestamp')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                    {t('audit.action')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                    {t('audit.resource')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                    {t('audit.actor')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                    {t('audit.ip')}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-text-secondary">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border-default">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-theme-bg-secondary">
                    <td className="px-4 py-3 text-sm text-theme-text-primary whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-text-primary">
                      {log.resource}
                      {log.targetId && (
                        <code className="ml-1 px-1 py-0.5 bg-theme-bg-secondary rounded text-xs">
                          {log.targetId.substring(0, 8)}...
                        </code>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-text-secondary">
                      {log.actorEmail || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-text-secondary font-mono">
                      {log.ipAddress ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-primary rounded"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > limit && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={setPage}
          total={total}
          limit={limit}
        />
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-text-primary">
                {t('audit.logDetail')}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded hover:bg-theme-bg-secondary"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.timestamp')}</div>
                  <div className="text-theme-text-primary">{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.action')}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.resource')}</div>
                  <div className="text-theme-text-primary">{selectedLog.resource}</div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.targetId')}</div>
                  <code className="text-sm text-theme-text-primary">
                    {selectedLog.targetId || '-'}
                  </code>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.actor')}</div>
                  <div className="text-theme-text-primary">{selectedLog.actorEmail}</div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.actorType')}</div>
                  <div className="text-theme-text-primary">{selectedLog.actorType}</div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.ip')}</div>
                  <div className="text-theme-text-primary font-mono">
                    {selectedLog.ipAddress ?? '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.method')}</div>
                  <div className="text-theme-text-primary">{selectedLog.method}</div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.path')}</div>
                  <div className="text-theme-text-primary font-mono text-xs truncate">
                    {selectedLog.path}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.statusCode')}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      selectedLog.success
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedLog.statusCode}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-theme-text-secondary">{t('audit.duration')}</div>
                  <div className="text-theme-text-primary">{selectedLog.durationMs}ms</div>
                </div>
                {selectedLog.errorMessage && (
                  <div className="col-span-2">
                    <div className="text-sm text-theme-text-secondary">
                      {t('audit.errorMessage')}
                    </div>
                    <div className="text-red-600">{selectedLog.errorMessage}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
