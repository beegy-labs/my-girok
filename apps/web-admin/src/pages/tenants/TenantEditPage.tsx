import { useEffect, useState, useCallback, FormEvent, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle, Ban, XCircle } from 'lucide-react';
import {
  tenantApi,
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  UpdateStatusRequest,
} from '../../api/tenant';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { Modal } from '../../components/molecules/Modal';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { getTenantTypeOptions } from '../../config/tenant.config';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';

export default function TenantEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();
  const isNew = !id;

  // SSOT: Use config-based options
  const tenantTypeOptions = useMemo(() => getTenantTypeOptions(t, false), [t]);

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'TenantEditPage',
    showToast: false,
  });

  const createMutation = useApiMutation({
    mutationFn: (data: CreateTenantRequest) => tenantApi.create(data),
    successToast: 'Tenant created successfully',
    onSuccess: () => navigate('/organization/partners'),
    context: 'CreateTenant',
  });

  const updateMutation = useApiMutation({
    mutationFn: (data: { id: string; update: UpdateTenantRequest }) =>
      tenantApi.update(data.id, data.update),
    successToast: 'Tenant updated successfully',
    onSuccess: () => navigate('/organization/partners'),
    context: 'UpdateTenant',
  });

  const updateStatusMutation = useApiMutation({
    mutationFn: (data: { id: string; update: UpdateStatusRequest }) =>
      tenantApi.updateStatus(data.id, data.update),
    successToast: 'Tenant status updated successfully',
    onSuccess: (updated) => {
      setStatus(updated.status);
      setApprovedAt(updated.approvedAt);
    },
    context: 'UpdateTenantStatus',
  });

  const saving = createMutation.isLoading || updateMutation.isLoading;
  const statusUpdating = updateStatusMutation.isLoading;

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<Tenant['type']>('INTERNAL');
  const [status, setStatus] = useState<Tenant['status']>('PENDING');
  const [settings, setSettings] = useState('{}');
  const [adminCount, setAdminCount] = useState(0);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  // Dialog states
  const [terminateDialog, setTerminateDialog] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchTenant();
    }
  }, [id]);

  const fetchTenant = useCallback(async () => {
    const result = await executeWithErrorHandling(() => tenantApi.get(id!));

    if (result) {
      setName(result.name);
      setSlug(result.slug);
      setType(result.type);
      setStatus(result.status);
      setSettings(JSON.stringify(result.settings || {}, null, 2));
      setAdminCount(result.adminCount);
      setApprovedAt(result.approvedAt);
    }
  }, [id, executeWithErrorHandling]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    let parsedSettings = {};
    try {
      parsedSettings = JSON.parse(settings);
    } catch {
      return;
    }

    if (isNew) {
      const data: CreateTenantRequest = {
        name,
        slug,
        type,
        settings: parsedSettings,
      };
      await createMutation.mutate(data);
    } else {
      const data: UpdateTenantRequest = {
        name,
        settings: parsedSettings,
      };
      await updateMutation.mutate({ id: id!, update: data });
    }
  };

  const handleStatusUpdate = useCallback(
    async (newStatus: Tenant['status'], reason?: string) => {
      if (!id) return;
      const data: UpdateStatusRequest = { status: newStatus, reason };
      await updateStatusMutation.mutate({ id, update: data });
    },
    [id, updateStatusMutation],
  );

  const handleSuspendClick = useCallback(() => {
    setSuspendModal(true);
  }, []);

  const handleSuspendConfirm = useCallback(async () => {
    if (!suspendReason.trim()) {
      return;
    }
    await handleStatusUpdate('SUSPENDED', suspendReason);
    setSuspendModal(false);
    setSuspendReason('');
  }, [suspendReason, handleStatusUpdate]);

  const handleSuspendCancel = useCallback(() => {
    setSuspendModal(false);
    setSuspendReason('');
  }, []);

  const handleTerminateClick = useCallback(() => {
    setTerminateDialog(true);
  }, []);

  const handleTerminateConfirm = useCallback(async () => {
    await handleStatusUpdate('TERMINATED');
    setTerminateDialog(false);
  }, [handleStatusUpdate]);

  const handleTerminateCancel = useCallback(() => {
    setTerminateDialog(false);
  }, []);

  const canCreate = hasPermission('tenant:create');
  const canApprove = hasPermission('tenant:approve');
  const canSuspend = hasPermission('tenant:suspend');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/organization/partners"
          className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {isNew ? t('tenants.createTenant') : t('tenants.editTenant')}
          </h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Status actions (for existing tenants) */}
      {!isNew && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">{t('common.status')}</h2>

          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'ACTIVE'
                  ? 'bg-theme-status-success-bg text-theme-status-success-text'
                  : status === 'PENDING'
                    ? 'bg-theme-status-warning-bg text-theme-status-warning-text'
                    : status === 'SUSPENDED'
                      ? 'bg-theme-status-warning-bg text-theme-status-warning-text'
                      : 'bg-theme-status-error-bg text-theme-status-error-text'
              }`}
            >
              {t(`tenants.status${status.charAt(0)}${status.slice(1).toLowerCase()}`)}
            </span>

            {approvedAt && (
              <span className="text-sm text-theme-text-tertiary">
                Approved on {new Date(approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {status === 'PENDING' && canApprove && (
              <button
                onClick={() => handleStatusUpdate('ACTIVE')}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-theme-status-success-text text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>{t('tenants.approve')}</span>
              </button>
            )}

            {status === 'ACTIVE' && canSuspend && (
              <button
                onClick={handleSuspendClick}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-theme-status-warning-text text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Ban size={16} />
                )}
                <span>{t('tenants.suspend')}</span>
              </button>
            )}

            {status === 'SUSPENDED' && canApprove && (
              <button
                onClick={() => handleStatusUpdate('ACTIVE')}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-theme-status-success-text text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>{t('tenants.activate')}</span>
              </button>
            )}

            {status !== 'TERMINATED' && canSuspend && (
              <button
                onClick={handleTerminateClick}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-theme-status-error-text text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                <span>{t('tenants.terminate')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">Tenant Information</h2>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              {t('tenants.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Company Name"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              {t('tenants.slug')}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              disabled={!isNew}
              required
              placeholder="company-slug"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary font-mono disabled:opacity-50"
            />
            <p className="mt-1 text-sm text-theme-text-tertiary">
              URL-safe identifier. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              {t('tenants.tenantType')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Tenant['type'])}
              disabled={!isNew}
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary disabled:opacity-50"
            >
              {tenantTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              Settings (JSON)
            </label>
            <textarea
              value={settings}
              onChange={(e) => setSettings(e.target.value)}
              rows={4}
              placeholder="{}"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary font-mono text-sm resize-none"
            />
          </div>

          {!isNew && (
            <div className="pt-4 border-t border-theme-border-default">
              <p className="text-sm text-theme-text-tertiary">
                <span className="font-medium">Admins:</span> {adminCount}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/organization/partners"
            className="px-6 py-3 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
          >
            {t('common.cancel')}
          </Link>
          {(isNew ? canCreate : true) && (
            <button
              type="submit"
              disabled={saving || !name || !slug}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              <Save size={18} />
              <span>{saving ? 'Saving...' : t('common.save')}</span>
            </button>
          )}
        </div>
      </form>

      {/* Terminate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={terminateDialog}
        title={t('tenants.terminateConfirm')}
        message={t('tenants.terminateMessage')}
        confirmLabel={t('tenants.terminate')}
        variant="danger"
        onConfirm={handleTerminateConfirm}
        onCancel={handleTerminateCancel}
        loading={statusUpdating}
      />

      {/* Suspend Modal with Reason Input */}
      <Modal
        isOpen={suspendModal}
        onClose={handleSuspendCancel}
        title={t('tenants.suspendConfirm')}
      >
        <p className="text-sm text-theme-text-secondary mb-4">{t('tenants.suspendMessage')}</p>
        <Input
          label={t('tenants.suspendReason')}
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder={t('tenants.suspendReasonPlaceholder')}
        />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={handleSuspendCancel} disabled={statusUpdating}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleSuspendConfirm} loading={statusUpdating}>
            {t('tenants.suspend')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
