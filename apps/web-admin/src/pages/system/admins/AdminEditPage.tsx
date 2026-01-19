import { use, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import type {
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminAccountDetail,
  AdminRoleListResponse,
} from '@my-girok/types';
import { adminAccountsApi } from '../../../api/adminAccounts';
import { createKeyedResourceCache } from '../../../utils/suspense';
import { toast } from 'sonner';

// Resource caches
const adminDetailCache = createKeyedResourceCache<string, AdminAccountDetail>((adminId) => {
  return adminAccountsApi.getById(adminId);
});

const rolesCache = createKeyedResourceCache<string, AdminRoleListResponse>((scope) => {
  return adminAccountsApi.getRoles({ scope: scope as 'SYSTEM' | 'TENANT' });
});

interface FormData {
  email: string;
  name: string;
  tempPassword: string;
  roleId: string;
  scope: 'SYSTEM' | 'TENANT';
}

interface FormErrors {
  email?: string;
  name?: string;
  tempPassword?: string;
  roleId?: string;
}

interface AdminFormContentProps {
  adminId?: string;
  onSuccess: () => void;
}

function AdminFormContent({ adminId, onSuccess }: AdminFormContentProps) {
  const { t } = useTranslation();
  const isEdit = !!adminId;

  // Fetch admin data if editing
  const existingAdmin = adminId ? use(adminDetailCache.get(adminId).read()) : null;

  // Initialize form with existing data or defaults
  const [formData, setFormData] = useState<FormData>(() => ({
    email: existingAdmin?.email || '',
    name: existingAdmin?.name || '',
    tempPassword: '',
    roleId: existingAdmin?.role.id || '',
    scope: existingAdmin?.scope || 'SYSTEM',
  }));

  // Fetch roles for the selected scope
  const rolesData = use(rolesCache.get(formData.scope).read());
  const roles = rolesData.roles;

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!isEdit) {
      if (!formData.email) {
        newErrors.email = t('admin.emailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('admin.invalidEmail');
      }

      if (!formData.tempPassword || formData.tempPassword.length < 8) {
        newErrors.tempPassword = t('admin.passwordMinLength');
      }

      if (!formData.roleId) {
        newErrors.roleId = t('admin.roleRequired');
      }
    }

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = t('admin.nameMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        const updateData: UpdateAdminRequest = { name: formData.name };
        await adminAccountsApi.update(adminId!, updateData);
        adminDetailCache.invalidate(adminId!);
        toast.success(t('admin.updateSuccess'));
      } else {
        const createData: CreateAdminRequest = {
          email: formData.email,
          name: formData.name,
          tempPassword: formData.tempPassword,
          roleId: formData.roleId,
          scope: formData.scope,
        };
        await adminAccountsApi.create(createData);
        toast.success(t('admin.createSuccess'));
      }
      onSuccess();
    } catch (_error) {
      toast.error(isEdit ? t('admin.updateError') : t('admin.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScopeChange = (newScope: 'SYSTEM' | 'TENANT') => {
    setFormData({ ...formData, scope: newScope, roleId: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t('admin.email')}
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="admin@example.com"
          disabled={isEdit}
          className={`w-full px-4 py-2 bg-theme-bg-secondary border rounded-lg text-theme-text-primary text-sm ${
            errors.email ? 'border-theme-status-error-text' : 'border-theme-border-default'
          } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-theme-status-error-text">{errors.email}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t('admin.name')}
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          className={`w-full px-4 py-2 bg-theme-bg-secondary border rounded-lg text-theme-text-primary text-sm ${
            errors.name ? 'border-theme-status-error-text' : 'border-theme-border-default'
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-theme-status-error-text">{errors.name}</p>}
      </div>

      {/* Create-only fields */}
      {!isEdit && (
        <>
          {/* Temp Password */}
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              {t('admin.tempPassword')}
            </label>
            <input
              type="password"
              value={formData.tempPassword}
              onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
              placeholder="********"
              className={`w-full px-4 py-2 bg-theme-bg-secondary border rounded-lg text-theme-text-primary text-sm ${
                errors.tempPassword
                  ? 'border-theme-status-error-text'
                  : 'border-theme-border-default'
              }`}
            />
            {errors.tempPassword && (
              <p className="mt-1 text-xs text-theme-status-error-text">{errors.tempPassword}</p>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              {t('admin.scope')}
            </label>
            <select
              value={formData.scope}
              onChange={(e) => handleScopeChange(e.target.value as 'SYSTEM' | 'TENANT')}
              className="w-full px-4 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
            >
              <option value="SYSTEM">SYSTEM</option>
              <option value="TENANT">TENANT</option>
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              {t('admin.role')}
            </label>
            <Suspense
              fallback={
                <select
                  disabled
                  className="w-full px-4 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm opacity-50"
                >
                  <option>{t('admin.loadingRoles')}</option>
                </select>
              }
            >
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className={`w-full px-4 py-2 bg-theme-bg-secondary border rounded-lg text-theme-text-primary text-sm ${
                  errors.roleId ? 'border-theme-status-error-text' : 'border-theme-border-default'
                }`}
              >
                <option value="">{t('admin.selectRole')}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName} (Level {role.level})
                  </option>
                ))}
              </select>
            </Suspense>
            {errors.roleId && (
              <p className="mt-1 text-xs text-theme-status-error-text">{errors.roleId}</p>
            )}
          </div>
        </>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-theme-border-default rounded-lg text-theme-text-primary hover:bg-theme-bg-secondary transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEdit ? t('common.save') : t('common.create')}
        </button>
      </div>
    </form>
  );
}

export default function AdminEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const handleSuccess = () => {
    if (isEdit) {
      navigate(`/system/admins/${id}`);
    } else {
      navigate('/system/admins');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
          {isEdit ? t('admin.editAdmin') : t('admin.createAdmin')}
        </h1>
      </div>

      {/* Form Card */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl max-w-2xl">
        <div className="px-6 py-4 border-b border-theme-border-default">
          <h2 className="text-lg font-semibold text-theme-text-primary">{t('admin.basicInfo')}</h2>
        </div>
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-theme-text-tertiary" />
              </div>
            }
          >
            <AdminFormContent adminId={id} onSuccess={handleSuccess} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
