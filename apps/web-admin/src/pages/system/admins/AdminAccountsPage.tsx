import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Search,
  Filter,
  Loader2,
  Eye,
  UserCheck,
  UserX,
  MoreHorizontal,
} from 'lucide-react';
import {
  adminAccountsApi,
  type AdminAccount,
  type AdminListQuery,
} from '../../../api/adminAccounts';
import { useAdminAuthStore } from '../../../stores/adminAuthStore';
import { useApiError } from '../../../hooks/useApiError';

export default function AdminAccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'AdminAccountsPage.fetchAdmins',
    retry: true,
  });

  const fetchAdmins = useCallback(async () => {
    const query: AdminListQuery = {
      page,
      limit,
      search: search || undefined,
      scope: (scopeFilter as 'SYSTEM' | 'TENANT') || undefined,
    };
    const response = await executeWithErrorHandling(async () => {
      return await adminAccountsApi.list(query);
    });
    if (response) {
      setAdmins(response.admins);
      setTotal(response.total);
    }
  }, [page, search, scopeFilter, executeWithErrorHandling]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAdmins();
  };

  const handleDeactivate = async (id: string) => {
    await executeWithErrorHandling(async () => {
      await adminAccountsApi.deactivate(id);
    });
    fetchAdmins();
    setOpenDropdown(null);
  };

  const handleReactivate = async (id: string) => {
    await executeWithErrorHandling(async () => {
      await adminAccountsApi.reactivate(id);
    });
    fetchAdmins();
    setOpenDropdown(null);
  };

  const canCreate = hasPermission('system_admin:create');
  const canUpdate = hasPermission('system_admin:update');
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
            {t('admin.adminAccounts')}
          </h1>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            {t('admin.adminAccountsDescription')}
          </p>
        </div>
        {canCreate && (
          <Link
            to="/system/admins/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>{t('admin.addAdmin')}</span>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Filter size={18} className="text-theme-text-tertiary hidden sm:block" />

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto"
          >
            <div className="relative flex-1 sm:flex-none">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.searchPlaceholder')}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
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
            value={scopeFilter}
            onChange={(e) => {
              setScopeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">{t('admin.allScopes')}</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="TENANT">TENANT</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {t('admin.adminCount', { count: total })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-full">
            <thead>
              <tr>
                <th>{t('admin.email')}</th>
                <th>{t('admin.name')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.scope')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.lastLogin')}</th>
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
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-theme-text-tertiary">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="font-medium text-theme-text-primary">{admin.email}</td>
                    <td className="text-theme-text-secondary">{admin.name}</td>
                    <td>
                      <span className="px-2 py-1 bg-theme-bg-secondary rounded text-xs font-medium">
                        {admin.role.displayName}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          admin.scope === 'SYSTEM'
                            ? 'bg-theme-primary/10 text-theme-primary'
                            : 'bg-theme-bg-secondary text-theme-text-secondary'
                        }`}
                      >
                        {admin.scope}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          admin.isActive
                            ? 'bg-theme-status-success-bg text-theme-status-success-text'
                            : 'bg-theme-status-error-bg text-theme-status-error-text'
                        }`}
                      >
                        {admin.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="text-theme-text-secondary">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === admin.id ? null : admin.id);
                          }}
                          className="p-2 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openDropdown === admin.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-theme-bg-card border border-theme-border-default rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => {
                                navigate(`/system/admins/${admin.id}`);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-theme-text-primary hover:bg-theme-bg-secondary"
                            >
                              <Eye size={16} />
                              {t('common.view')}
                            </button>
                            {canUpdate && (
                              <button
                                onClick={() => {
                                  navigate(`/system/admins/${admin.id}/edit`);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-theme-text-primary hover:bg-theme-bg-secondary"
                              >
                                <Pencil size={16} />
                                {t('common.edit')}
                              </button>
                            )}
                            {canUpdate && admin.isActive && (
                              <button
                                onClick={() => handleDeactivate(admin.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-theme-status-error-text hover:bg-theme-bg-secondary"
                              >
                                <UserX size={16} />
                                {t('common.deactivate')}
                              </button>
                            )}
                            {canUpdate && !admin.isActive && (
                              <button
                                onClick={() => handleReactivate(admin.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-theme-text-primary hover:bg-theme-bg-secondary"
                              >
                                <UserCheck size={16} />
                                {t('common.reactivate')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-full sm:w-auto px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {t('common.previous')}
          </button>
          <span className="px-4 py-2 text-sm text-theme-text-secondary order-first sm:order-none">
            {t('common.page', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-full sm:w-auto px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
