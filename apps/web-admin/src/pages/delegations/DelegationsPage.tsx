import { useEffect, useState, useCallback } from 'react';
import { UserCog, Filter, Loader2, Ban } from 'lucide-react';
import { delegationApi, Delegation } from '../../api/delegations';
import { useApiError } from '../../hooks/useApiError';

export default function DelegationsPage() {
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
    if (!confirm('Are you sure you want to revoke this delegation?')) return;

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
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">Delegations</h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            Manage employee access delegations and permissions
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
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {total} delegations
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
            <p>No delegations found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full">
                <thead>
                  <tr>
                    <th>Delegator</th>
                    <th>Delegatee</th>
                    <th>Scope</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                        <ScopeBadge scope={delegation.scope} />
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
                        <StatusBadge status={delegation.status} />
                      </td>
                      <td>
                        {delegation.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevoke(delegation.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Ban size={14} />
                            Revoke
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
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
                  >
                    Next
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

function ScopeBadge({ scope }: { scope: string }) {
  const styles: Record<string, string> = {
    ALL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    SPECIFIC_PERMISSIONS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[scope] || 'bg-gray-100 text-gray-800'}`}
    >
      {scope.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REVOKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}
