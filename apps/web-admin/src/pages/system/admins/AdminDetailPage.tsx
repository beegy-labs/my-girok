import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Shield, Loader2 } from 'lucide-react';
import { adminAccountsApi, type AdminAccountDetail } from '../../../api/adminAccounts';
import { useAdminAuthStore } from '../../../stores/adminAuthStore';
import { useApiError } from '../../../hooks/useApiError';

export default function AdminDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();

  const [admin, setAdmin] = useState<AdminAccountDetail | null>(null);

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'AdminDetailPage.fetchAdmin',
    retry: true,
  });

  const fetchAdmin = useCallback(async () => {
    if (!id) return;
    const response = await executeWithErrorHandling(async () => {
      return await adminAccountsApi.getById(id);
    });
    if (response) {
      setAdmin(response);
    }
  }, [id, executeWithErrorHandling]);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const canUpdate = hasPermission('system_admin:update');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-theme-status-error-text">{t('common.error')}</p>
        <button
          onClick={() => navigate('/system/admins')}
          className="flex items-center gap-2 px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/system/admins')}
          className="p-2 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">{admin.name}</h1>
          <p className="text-sm text-theme-text-secondary">{admin.email}</p>
        </div>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${
            admin.isActive
              ? 'bg-theme-status-success-bg text-theme-status-success-text'
              : 'bg-theme-status-error-bg text-theme-status-error-text'
          }`}
        >
          {admin.isActive ? t('common.active') : t('common.inactive')}
        </span>
        {canUpdate && (
          <button
            onClick={() => navigate(`/system/admins/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity"
          >
            <Edit size={16} />
            {t('common.edit')}
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
          <div className="px-6 py-4 border-b border-theme-border-default">
            <h2 className="text-lg font-semibold text-theme-text-primary">
              {t('admin.basicInfo')}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-theme-text-tertiary">{t('admin.email')}</label>
                <p className="font-medium text-theme-text-primary">{admin.email}</p>
              </div>
              <div>
                <label className="text-sm text-theme-text-tertiary">{t('admin.name')}</label>
                <p className="font-medium text-theme-text-primary">{admin.name}</p>
              </div>
              <div>
                <label className="text-sm text-theme-text-tertiary">{t('admin.scope')}</label>
                <p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      admin.scope === 'SYSTEM'
                        ? 'bg-theme-primary/10 text-theme-primary'
                        : 'bg-theme-bg-secondary text-theme-text-secondary'
                    }`}
                  >
                    {admin.scope}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-theme-text-tertiary">{t('admin.role')}</label>
                <p className="font-medium text-theme-text-primary">{admin.role.displayName}</p>
                <p className="text-xs text-theme-text-tertiary">Level {admin.role.level}</p>
              </div>
              {admin.tenant && (
                <div>
                  <label className="text-sm text-theme-text-tertiary">{t('admin.tenant')}</label>
                  <p className="font-medium text-theme-text-primary">{admin.tenant.name}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-theme-text-tertiary">{t('admin.lastLogin')}</label>
                <p className="text-theme-text-primary">
                  {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-theme-text-tertiary">{t('admin.createdAt')}</label>
                <p className="text-theme-text-primary">
                  {new Date(admin.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
          <div className="px-6 py-4 border-b border-theme-border-default">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-text-primary">
              <Shield size={18} />
              {t('admin.permissions')}
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {admin.permissions.length === 0 ? (
                <p className="text-theme-text-tertiary text-sm">{t('admin.noPermissions')}</p>
              ) : (
                admin.permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-theme-bg-secondary"
                  >
                    <div>
                      <p className="font-medium text-sm text-theme-text-primary">
                        {perm.displayName}
                      </p>
                      <p className="text-xs text-theme-text-tertiary">
                        {perm.resource}:{perm.action}
                      </p>
                    </div>
                    <span className="px-2 py-1 border border-theme-border-default rounded text-xs text-theme-text-secondary">
                      {perm.category}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-theme-text-tertiary mt-4">
              {t('admin.permissionsReadOnly')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
