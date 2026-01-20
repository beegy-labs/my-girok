import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { servicesApi } from '../../api/services';
import type {
  ServiceConfig,
  UpdateServiceConfigDto,
  DomainResponse,
  AuditLevel,
} from '@my-girok/types';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Card } from '../../components/atoms/Card';
import { ServiceSelector } from '../../components/molecules/ServiceSelector';
import { IpWhitelistInput } from '../../components/molecules/IpWhitelistInput';
import { DomainListManager } from '../../components/molecules/DomainListManager';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-theme-border rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-theme-bg-secondary hover:bg-theme-bg-tertiary transition-colors"
      >
        <h3 className="font-semibold text-theme-text-primary">{title}</h3>
        <span className="text-theme-text-tertiary">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function ServiceConfigPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('service:update');

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [config, setConfig] = useState<ServiceConfig | null>(null);
  const [domains, setDomains] = useState<DomainResponse>({ domains: [], primaryDomain: null });
  const [formData, setFormData] = useState<Partial<ServiceConfig>>({
    jwtValidation: true,
    domainValidation: true,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    rateLimitEnabled: false,
    rateLimitRequests: 100,
    rateLimitWindow: 60,
    maintenanceMode: false,
    maintenanceMessage: null,
    auditLevel: 'STANDARD',
  });
  const [changeReason, setChangeReason] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const { executeWithErrorHandling } = useApiError({
    context: 'ServiceConfigPage.loadConfig',
    retry: true,
  });

  const loadConfig = useCallback(
    async (serviceId: string) => {
      const [configResult, domainsResult] = await Promise.all([
        executeWithErrorHandling(async () => servicesApi.getServiceConfig(serviceId)),
        executeWithErrorHandling(async () => servicesApi.getServiceDomains(serviceId)),
      ]);

      if (configResult) {
        setConfig(configResult);
        setFormData(configResult);
      }

      if (domainsResult) {
        setDomains(domainsResult);
      }
    },
    [executeWithErrorHandling],
  );

  const updateMutation = useApiMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: UpdateServiceConfigDto }) =>
      servicesApi.updateServiceConfig(serviceId, data),
    context: 'ServiceConfigPage.update',
    onSuccess: () => {
      setShowSaveConfirm(false);
      setChangeReason('');
      if (selectedServiceId) {
        loadConfig(selectedServiceId);
      }
    },
  });

  const addDomainMutation = useApiMutation({
    mutationFn: ({
      serviceId,
      domain,
      isPrimary,
    }: {
      serviceId: string;
      domain: string;
      isPrimary?: boolean;
    }) => servicesApi.addServiceDomain(serviceId, domain, isPrimary),
    context: 'ServiceConfigPage.addDomain',
    onSuccess: (result) => {
      setDomains(result);
    },
  });

  const removeDomainMutation = useApiMutation({
    mutationFn: ({ serviceId, domain }: { serviceId: string; domain: string }) =>
      servicesApi.removeServiceDomain(serviceId, domain),
    context: 'ServiceConfigPage.removeDomain',
    onSuccess: (result) => {
      setDomains(result);
    },
  });

  useEffect(() => {
    if (selectedServiceId) {
      loadConfig(selectedServiceId);
    }
  }, [selectedServiceId, loadConfig]);

  const handleSave = () => {
    if (!changeReason.trim()) {
      return;
    }

    if (selectedServiceId) {
      const updateData: UpdateServiceConfigDto = {
        jwtValidation: formData.jwtValidation,
        domainValidation: formData.domainValidation,
        ipWhitelistEnabled: formData.ipWhitelistEnabled,
        ipWhitelist: formData.ipWhitelist,
        rateLimitEnabled: formData.rateLimitEnabled,
        rateLimitRequests: formData.rateLimitRequests,
        rateLimitWindow: formData.rateLimitWindow,
        maintenanceMode: formData.maintenanceMode,
        maintenanceMessage: formData.maintenanceMessage || undefined,
        auditLevel: formData.auditLevel,
        reason: changeReason,
      };

      updateMutation.mutate({
        serviceId: selectedServiceId,
        data: updateData,
      });
    }
  };

  const handleDomainsChange = (newDomains: string[]) => {
    if (!selectedServiceId) return;

    const added = newDomains.filter((d) => !domains.domains.includes(d));
    const removed = domains.domains.filter((d) => !newDomains.includes(d));

    added.forEach((domain) => {
      addDomainMutation.mutate({
        serviceId: selectedServiceId,
        domain,
        isPrimary: newDomains.length === 1,
      });
    });

    removed.forEach((domain) => {
      removeDomainMutation.mutate({ serviceId: selectedServiceId, domain });
    });
  };

  const handlePrimaryDomainChange = (domain: string) => {
    if (!selectedServiceId || !domains.domains.includes(domain)) return;

    addDomainMutation.mutate({
      serviceId: selectedServiceId,
      domain,
      isPrimary: true,
    });
  };

  const hasChanges = config && JSON.stringify(formData) !== JSON.stringify(config);

  const auditLevels: AuditLevel[] = ['MINIMAL', 'STANDARD', 'VERBOSE', 'DEBUG'];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-theme-primary" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('serviceConfig.title')}</h1>
          <p className="text-sm text-theme-text-secondary">{t('serviceConfig.description')}</p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <label className="block text-sm font-medium text-theme-text-secondary mb-2">
          {t('serviceConfig.selectService')}
        </label>
        <ServiceSelector value={selectedServiceId} onChange={setSelectedServiceId} />
      </Card>

      {selectedServiceId && config && (
        <div className="space-y-4">
          {/* General Settings */}
          <CollapsibleSection title={t('serviceConfig.generalSettings')}>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.jwtValidation}
                  onChange={(e) => setFormData({ ...formData, jwtValidation: e.target.checked })}
                  disabled={!canEdit}
                />
                <div>
                  <span className="text-sm font-medium text-theme-text-primary">
                    {t('serviceConfig.jwtValidationEnabled')}
                  </span>
                  <p className="text-xs text-theme-text-tertiary">
                    {t('serviceConfig.jwtValidationDescription')}
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.domainValidation}
                  onChange={(e) => setFormData({ ...formData, domainValidation: e.target.checked })}
                  disabled={!canEdit}
                />
                <div>
                  <span className="text-sm font-medium text-theme-text-primary">
                    {t('serviceConfig.domainValidationEnabled')}
                  </span>
                  <p className="text-xs text-theme-text-tertiary">
                    {t('serviceConfig.domainValidationDescription')}
                  </p>
                </div>
              </label>
            </div>
          </CollapsibleSection>

          {/* Domain Management */}
          <CollapsibleSection title={t('serviceConfig.domains')}>
            <div>
              <p className="text-sm text-theme-text-secondary mb-4">
                {t('serviceConfig.domainsDescription')}
              </p>
              <DomainListManager
                domains={domains.domains}
                primaryDomain={domains.primaryDomain || undefined}
                onChange={handleDomainsChange}
                onPrimaryChange={handlePrimaryDomainChange}
                disabled={!canEdit}
              />
            </div>
          </CollapsibleSection>

          {/* Rate Limiting */}
          <CollapsibleSection title={t('serviceConfig.rateLimiting')}>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.rateLimitEnabled}
                  onChange={(e) => setFormData({ ...formData, rateLimitEnabled: e.target.checked })}
                  disabled={!canEdit}
                />
                <div>
                  <span className="text-sm font-medium text-theme-text-primary">
                    {t('serviceConfig.rateLimitEnabled')}
                  </span>
                  <p className="text-xs text-theme-text-tertiary">
                    {t('serviceConfig.rateLimitDescription')}
                  </p>
                </div>
              </label>

              {formData.rateLimitEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                      {t('serviceConfig.maxRequests')}
                    </label>
                    <Input
                      type="number"
                      value={formData.rateLimitRequests}
                      onChange={(e) =>
                        setFormData({ ...formData, rateLimitRequests: Number(e.target.value) })
                      }
                      disabled={!canEdit}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                      {t('serviceConfig.timeWindow')}
                    </label>
                    <Input
                      type="number"
                      value={formData.rateLimitWindow}
                      onChange={(e) =>
                        setFormData({ ...formData, rateLimitWindow: Number(e.target.value) })
                      }
                      disabled={!canEdit}
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* IP Whitelist */}
          <CollapsibleSection title={t('serviceConfig.ipWhitelist')}>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ipWhitelistEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, ipWhitelistEnabled: e.target.checked })
                  }
                  disabled={!canEdit}
                />
                <div>
                  <span className="text-sm font-medium text-theme-text-primary">
                    {t('serviceConfig.ipWhitelistEnabled')}
                  </span>
                  <p className="text-xs text-theme-text-tertiary">
                    {t('serviceConfig.ipWhitelistDescription')}
                  </p>
                </div>
              </label>

              {formData.ipWhitelistEnabled && (
                <div className="pl-6">
                  <IpWhitelistInput
                    value={formData.ipWhitelist || []}
                    onChange={(ips) => setFormData({ ...formData, ipWhitelist: ips })}
                    disabled={!canEdit}
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Maintenance Mode */}
          <CollapsibleSection title={t('serviceConfig.maintenanceMode')}>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.maintenanceMode}
                  onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                  disabled={!canEdit}
                />
                <div>
                  <span className="text-sm font-medium text-theme-text-primary">
                    {t('serviceConfig.maintenanceModeEnabled')}
                  </span>
                  <p className="text-xs text-theme-text-tertiary">
                    {t('serviceConfig.maintenanceModeDescription')}
                  </p>
                </div>
              </label>

              {formData.maintenanceMode && (
                <div className="pl-6">
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                    {t('serviceConfig.maintenanceMessage')}
                  </label>
                  <textarea
                    value={formData.maintenanceMessage || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, maintenanceMessage: e.target.value })
                    }
                    disabled={!canEdit}
                    className="w-full p-2 border border-theme-border rounded bg-theme-bg-primary text-theme-text-primary"
                    rows={3}
                    placeholder={t('serviceConfig.maintenanceMessagePlaceholder')}
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Audit Level */}
          <CollapsibleSection title={t('serviceConfig.auditLevel')}>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                {t('serviceConfig.auditLevelDescription')}
              </label>
              <select
                value={formData.auditLevel}
                onChange={(e) =>
                  setFormData({ ...formData, auditLevel: e.target.value as AuditLevel })
                }
                disabled={!canEdit}
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                {auditLevels.map((level) => (
                  <option key={level} value={level}>
                    {t(`serviceConfig.auditLevels.${level}`)}
                  </option>
                ))}
              </select>
            </div>
          </CollapsibleSection>

          {/* Save Actions */}
          {canEdit && hasChanges && (
            <Card className="p-4 bg-theme-warning/10 border-theme-warning">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-theme-warning mt-1" size={20} />
                <div>
                  <h4 className="font-medium text-theme-text-primary mb-1">
                    {t('serviceConfig.reasonForChange')}
                  </h4>
                  <p className="text-sm text-theme-text-secondary mb-3">
                    {t('serviceConfig.reasonRequired')}
                  </p>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full p-2 border border-theme-border rounded bg-theme-bg-primary text-theme-text-primary"
                    rows={3}
                    placeholder={t('serviceConfig.reasonPlaceholder')}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFormData(config);
                    setChangeReason('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={!changeReason.trim() || updateMutation.isLoading}
                >
                  <Save size={16} />
                  {t('serviceConfig.saveConfig')}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {!selectedServiceId && (
        <Card className="p-8 text-center">
          <Settings className="mx-auto mb-4 text-theme-text-tertiary" size={48} />
          <p className="text-theme-text-secondary">{t('serviceConfig.selectService')}</p>
        </Card>
      )}

      <ConfirmDialog
        isOpen={showSaveConfirm}
        onCancel={() => setShowSaveConfirm(false)}
        onConfirm={handleSave}
        title={t('serviceConfig.confirmChange')}
        message={t('serviceConfig.confirmChangeMessage')}
        confirmLabel={t('common.save')}
        variant="warning"
      />
    </div>
  );
}
