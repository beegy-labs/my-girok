import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Save, X, Shield, Gauge, Wrench, Activity } from 'lucide-react';
import { servicesApi, ServiceConfig, AuditLevel } from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { useAuditEvent } from '../../hooks';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';

interface ServiceConfigTabProps {
  serviceId: string;
}

const AUDIT_LEVELS: AuditLevel[] = ['MINIMAL', 'STANDARD', 'VERBOSE', 'DEBUG'];

export default function ServiceConfigTab({ serviceId }: ServiceConfigTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const { trackFormSubmit } = useAuditEvent();
  const canEdit = hasPermission('service:update');

  // Config state
  const [config, setConfig] = useState<ServiceConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<ServiceConfig>>({});
  const [reason, setReason] = useState('');

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    clearError,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceConfigTab',
    showToast: false,
  });

  const updateConfigMutation = useApiMutation({
    mutationFn: (data: any) => servicesApi.updateServiceConfig(serviceId, data),
    successToast: 'Service configuration updated successfully',
    onSuccess: () => {
      setReason('');
      fetchData();
    },
    context: 'UpdateServiceConfig',
  });

  const saving = updateConfigMutation.isLoading;

  const fetchData = useCallback(async () => {
    const result = await executeWithErrorHandling(() => servicesApi.getServiceConfig(serviceId));

    if (result) {
      setConfig(result);
      setFormData(result);
    }
  }, [serviceId, executeWithErrorHandling]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!reason.trim()) {
      return;
    }

    await updateConfigMutation.mutate({
      jwtValidation: formData.jwtValidation,
      domainValidation: formData.domainValidation,
      ipWhitelistEnabled: formData.ipWhitelistEnabled,
      ipWhitelist: formData.ipWhitelist,
      rateLimitEnabled: formData.rateLimitEnabled,
      rateLimitRequests: formData.rateLimitRequests,
      rateLimitWindow: formData.rateLimitWindow,
      maintenanceMode: formData.maintenanceMode,
      maintenanceMessage: formData.maintenanceMessage ?? undefined,
      auditLevel: formData.auditLevel,
      reason,
    });

    trackFormSubmit('ServiceConfigForm', 'update', !updateConfigMutation.isError);
  };

  const updateFormData = (key: keyof ServiceConfig, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
        <AlertCircle size={20} />
        <span>{errorMessage || t('services.configNotFound')}</span>
      </div>
    );
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(config);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
          <button onClick={clearError} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Security Section */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text-primary">
            {t('services.security')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-theme-bg-secondary rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.jwtValidation ?? false}
              onChange={(e) => updateFormData('jwtValidation', e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-theme-primary"
            />
            <div>
              <div className="font-medium text-theme-text-primary">
                {t('services.jwtValidation')}
              </div>
              <div className="text-sm text-theme-text-secondary">
                {t('services.jwtValidationDesc')}
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-theme-bg-secondary rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.domainValidation ?? false}
              onChange={(e) => updateFormData('domainValidation', e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-theme-primary"
            />
            <div>
              <div className="font-medium text-theme-text-primary">
                {t('services.domainValidation')}
              </div>
              <div className="text-sm text-theme-text-secondary">
                {t('services.domainValidationDesc')}
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-theme-bg-secondary rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.ipWhitelistEnabled ?? false}
              onChange={(e) => updateFormData('ipWhitelistEnabled', e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-theme-primary"
            />
            <div>
              <div className="font-medium text-theme-text-primary">{t('services.ipWhitelist')}</div>
              <div className="text-sm text-theme-text-secondary">
                {t('services.ipWhitelistDesc')}
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Rate Limiting Section */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={20} className="text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text-primary">
            {t('services.rateLimit')}
          </h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-theme-bg-secondary rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.rateLimitEnabled ?? false}
              onChange={(e) => updateFormData('rateLimitEnabled', e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-theme-primary"
            />
            <div className="font-medium text-theme-text-primary">
              {t('services.rateLimitEnabled')}
            </div>
          </label>

          {formData.rateLimitEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  {t('services.rateLimitRequests')}
                </label>
                <input
                  type="number"
                  value={formData.rateLimitRequests ?? 1000}
                  onChange={(e) => updateFormData('rateLimitRequests', parseInt(e.target.value))}
                  disabled={!canEdit}
                  min={1}
                  max={100000}
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  {t('services.rateLimitWindow')}
                </label>
                <input
                  type="number"
                  value={formData.rateLimitWindow ?? 60}
                  onChange={(e) => updateFormData('rateLimitWindow', parseInt(e.target.value))}
                  disabled={!canEdit}
                  min={1}
                  max={3600}
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Maintenance Mode Section */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Wrench size={20} className="text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text-primary">
            {t('services.maintenance')}
          </h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-theme-bg-secondary rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.maintenanceMode ?? false}
              onChange={(e) => updateFormData('maintenanceMode', e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-theme-primary"
            />
            <div>
              <div className="font-medium text-theme-text-primary">
                {t('services.maintenanceMode')}
              </div>
              <div className="text-sm text-theme-text-secondary">
                {t('services.maintenanceModeDesc')}
              </div>
            </div>
          </label>

          {formData.maintenanceMode && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.maintenanceMessage')}
              </label>
              <textarea
                value={formData.maintenanceMessage ?? ''}
                onChange={(e) => updateFormData('maintenanceMessage', e.target.value)}
                disabled={!canEdit}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Audit Level Section */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text-primary">
            {t('services.auditLevel')}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {AUDIT_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => canEdit && updateFormData('auditLevel', level)}
              disabled={!canEdit}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                formData.auditLevel === level
                  ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                  : 'border-theme-border-default bg-theme-bg-secondary text-theme-text-secondary hover:bg-theme-bg-primary'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </Card>

      {/* Save Section */}
      {canEdit && hasChanges && (
        <Card className="sticky bottom-4 border-theme-primary">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.changeReason')}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('services.changeReasonPlaceholder')}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
              />
            </div>
            <Button
              onClick={handleSave}
              loading={saving}
              icon={Save}
              trackingName="SaveServiceConfig"
            >
              {t('common.save')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
