import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCog, Filter, Loader2, Ban } from 'lucide-react';
import { Badge } from '@my-girok/ui-components';
import { delegationApi, Delegation } from '../../api/delegations';
import { useApiError } from '../../hooks/useApiError';

export default function DelegationsPage() {
  const { t } = useTranslation();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'DelegationsPage.fetchDelegations',
    retry: true,
  });

  const fetchDelegations = useCallback(async () => {
    const response = await executeWithErrorHandling(async () => {
      return await delegationApi.list({
        page,
        limit,
        status: statusFilter || undefined,
      });
    });
    if (response) {
      setDelegations(response.data);
      setTotal(response.total);
    }
  }, [page, statusFilter, executeWithErrorHandling]);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  const handleRevoke = async (id: string) => {
    if (!confirm(t('hr.delegations.revokeConfirm'))) return;

    await executeWithErrorHandling(async () => {
      await delegationApi.revoke(id, 'Revoked by admin');
    });
    fetchDelegations();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UserCog size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
              {t('hr.delegations.title')}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            {t('hr.delegations.description')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Filter size={18} className="text-theme-text-tertiary hidden sm:block" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">{t('hr.delegations.allStatuses')}</option>
            <option value="PENDING">{t('hr.delegations.status.PENDING')}</option>
            <option value="ACTIVE">{t('hr.delegations.status.ACTIVE')}</option>
            <option value="REVOKED">{t('hr.delegations.status.REVOKED')}</option>
            <option value="EXPIRED">{t('hr.delegations.status.EXPIRED')}</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {t('hr.delegations.count', { count: total })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-theme-primary" />
          </div>
        ) : delegations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
            <UserCog size={48} className="mb-4 opacity-50" />
            <p>{t('hr.delegations.noDelegations')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full">
                <thead>
                  <tr>
                    <th>{t('hr.delegations.delegator')}</th>
                    <th>{t('hr.delegations.delegatee')}</th>
                    <th>{t('hr.delegations.scope')}</th>
                    <th>{t('hr.delegations.startDate')}</th>
                    <th>{t('hr.delegations.endDate')}</th>
                    <th>{t('hr.delegations.reason')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {delegations.map((delegation) => (
                    <tr key={delegation.id}>
                      <td>
                        <span className="text-sm font-medium">{delegation.delegatorId}</span>
                      </td>
                      <td>
                        <span className="text-sm font-medium">{delegation.delegateeId}</span>
                      </td>
                      <td>
                        <Badge variant={delegation.scope === 'ALL' ? 'accent' : 'info'}>
                          {t(`hr.delegations.scopes.${delegation.scope}`)}
                        </Badge>
                        {delegation.permissions && delegation.permissions.length > 0 && (
                          <div className="text-xs text-theme-text-tertiary mt-1">
                            {delegation.permissions.slice(0, 3).join(', ')}
                            {delegation.permissions.length > 3 &&
                              ` +${delegation.permissions.length - 3}`}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary">
                          {delegation.startDate}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary">
                          {delegation.endDate}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary truncate max-w-xs block">
                          {delegation.reason || '-'}
                        </span>
                      </td>
                      <td>
                        <Badge
                          variant={
                            delegation.status === 'ACTIVE'
                              ? 'success'
                              : delegation.status === 'PENDING'
                                ? 'warning'
                                : delegation.status === 'REVOKED'
                                  ? 'error'
                                  : 'default'
                          }
                        >
                          {t(`hr.delegations.status.${delegation.status}`)}
                        </Badge>
                      </td>
                      <td>
                        {delegation.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevoke(delegation.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Ban size={14} />
                            {t('hr.delegations.revoke')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-theme-border-default">
                <div className="text-sm text-theme-text-tertiary">
                  {t('common.page', { current: page, total: totalPages })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
                  >
                    {t('common.previous')}
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
                  >
                    {t('common.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
