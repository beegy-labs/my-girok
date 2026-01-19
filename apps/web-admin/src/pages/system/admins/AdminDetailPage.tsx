import { use, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Shield, Loader2 } from 'lucide-react';
import type { AdminAccountDetail } from '@my-girok/types';
import { adminAccountsApi } from '../../../api/adminAccounts';
import { useAdminAuthStore } from '../../../stores/adminAuthStore';
import { createKeyedResourceCache } from '../../../utils/suspense';

// Resource cache for admin detail data
const adminDetailCache = createKeyedResourceCache<string, AdminAccountDetail>((adminId) => {
  return adminAccountsApi.getById(adminId);
});

interface AdminDetailContentProps {
  adminId: string;
}

function AdminDetailContent({ adminId }: AdminDetailContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();

  // Use Suspense-compatible resource
  const admin = use(adminDetailCache.get(adminId).read());

  const canUpdate = hasPermission('system_admin:update');

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
            onClick={() => navigate(`/system/admins/${adminId}/edit`)}
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
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.email')}</p>
              <p className="text-theme-text-primary font-medium">{admin.email}</p>
            </div>
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.name')}</p>
              <p className="text-theme-text-primary">{admin.name}</p>
            </div>
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.scope')}</p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  admin.scope === 'SYSTEM'
                    ? 'bg-theme-primary/10 text-theme-primary'
                    : 'bg-theme-bg-secondary text-theme-text-secondary'
                }`}
              >
                {admin.scope}
              </span>
            </div>
          </div>
        </div>

        {/* Role Card */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
          <div className="px-6 py-4 border-b border-theme-border-default">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-theme-primary" />
              <h2 className="text-lg font-semibold text-theme-text-primary">{t('admin.role')}</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.roleName')}</p>
              <p className="text-theme-text-primary font-medium">{admin.role.displayName}</p>
            </div>
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.roleDescription')}</p>
              <p className="text-theme-text-secondary">{admin.role.description || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.roleLevel')}</p>
              <p className="text-theme-text-primary">{admin.role.level}</p>
            </div>
          </div>
        </div>

        {/* Activity Card */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl md:col-span-2">
          <div className="px-6 py-4 border-b border-theme-border-default">
            <h2 className="text-lg font-semibold text-theme-text-primary">
              {t('admin.activityInfo')}
            </h2>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.createdAt')}</p>
              <p className="text-theme-text-primary">
                {new Date(admin.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-theme-text-tertiary">{t('admin.lastLogin')}</p>
              <p className="text-theme-text-primary">
                {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-theme-text-tertiary" />
        </div>
      }
    >
      <AdminDetailContent adminId={id} />
    </Suspense>
  );
}
