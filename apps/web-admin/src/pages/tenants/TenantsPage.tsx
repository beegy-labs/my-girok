import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Search, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { tenantApi, Tenant, TenantListResponse } from '../../api/tenant';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { getStatusOptions, getStatusConfig, type TenantStatus } from '../../config/tenant.config';
import { logger } from '../../utils/logger';

export default function TenantsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();
  const statusOptions = getStatusOptions(t);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TenantListResponse = await tenantApi.list({
        page,
        limit: 20,
        status: status || undefined,
        search: search || undefined,
      });

      setTenants(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(t('tenants.loadFailed'));
      logger.error('Failed to load tenants', err);
    } finally {
      setLoading(false);
    }
  }, [page, status, search, t]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTenants();
  };

  const canCreate = hasPermission('tenant:create');
  const canEdit = hasPermission('tenant:approve') || hasPermission('tenant:suspend');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('tenants.title')}</h1>
          <p className="text-theme-text-secondary mt-1">{t('tenants.description')}</p>
        </div>
        {canCreate && (
          <Link
            to="/organization/partners/new"
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>{t('tenants.newTenant')}</span>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-theme-bg-card border border-theme-border-default rounded-xl p-4">
        <Filter size={18} className="text-theme-text-tertiary" />

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tenants.searchPlaceholder')}
              className="pl-10 pr-4 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg text-sm hover:opacity-90"
          >
            {t('common.search')}
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm text-theme-text-tertiary">
          {t('tenants.tenantCount', { count: total })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('tenants.name')}</th>
              <th>{t('tenants.slug')}</th>
              <th>{t('tenants.tenantType')}</th>
              <th>{t('tenants.status')}</th>
              <th>Admins</th>
              <th>{t('tenants.createdAt')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-theme-text-tertiary" />
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-theme-text-tertiary">
                  {t('tenants.noTenants')}
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => {
                const statusConfig = getStatusConfig(tenant.status as TenantStatus);
                const StatusIcon = statusConfig.icon;
                const variantStyles: Record<string, string> = {
                  success: 'bg-theme-status-success-bg text-theme-status-success-text',
                  warning: 'bg-theme-status-warning-bg text-theme-status-warning-text',
                  error: 'bg-theme-status-error-bg text-theme-status-error-text',
                  default: 'bg-theme-bg-secondary text-theme-text-primary',
                };
                return (
                  <tr key={tenant.id}>
                    <td className="font-medium text-theme-text-primary">{tenant.name}</td>
                    <td className="text-theme-text-secondary font-mono text-sm">{tenant.slug}</td>
                    <td>
                      <span className="px-2 py-1 bg-theme-bg-secondary rounded text-xs font-medium">
                        {tenant.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${variantStyles[statusConfig.variant]}`}
                      >
                        <StatusIcon size={12} />
                        {t(statusConfig.labelKey)}
                      </span>
                    </td>
                    <td className="text-theme-text-secondary">{tenant.adminCount}</td>
                    <td className="text-theme-text-secondary">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/organization/partners/${tenant.id}`)}
                          className="p-2 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.previous')}
          </button>
          <span className="px-4 py-2 text-theme-text-secondary">
            {t('common.page', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
