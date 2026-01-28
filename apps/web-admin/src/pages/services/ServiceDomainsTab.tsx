import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Globe, Plus, X } from 'lucide-react';
import { servicesApi, DomainResponse } from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';

interface ServiceDomainsTabProps {
  serviceId: string;
}

export default function ServiceDomainsTab({ serviceId }: ServiceDomainsTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('service:update');

  const [domains, setDomains] = useState<DomainResponse | null>(null);
  const [newDomain, setNewDomain] = useState('');

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    clearError,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceDomainsTab',
    showToast: false,
  });

  const addDomainMutation = useApiMutation({
    mutationFn: (domain: string) => servicesApi.addServiceDomain(serviceId, domain),
    successToast: 'Domain added successfully',
    onSuccess: async () => {
      setNewDomain('');
      const domainsResult = await servicesApi.getServiceDomains(serviceId);
      setDomains(domainsResult);
    },
    context: 'AddServiceDomain',
  });

  const removeDomainMutation = useApiMutation({
    mutationFn: (domain: string) => servicesApi.removeServiceDomain(serviceId, domain),
    successToast: 'Domain removed successfully',
    onSuccess: (result) => setDomains(result),
    context: 'RemoveServiceDomain',
  });

  const addingDomain = addDomainMutation.isLoading;
  const removingDomain = removeDomainMutation.isLoading;

  const fetchDomains = useCallback(async () => {
    const result = await executeWithErrorHandling(() => servicesApi.getServiceDomains(serviceId));
    if (result) {
      setDomains(result);
    }
  }, [serviceId, executeWithErrorHandling]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    // Basic domain validation
    const domainPattern =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    if (!domainPattern.test(newDomain.trim())) {
      return;
    }

    await addDomainMutation.mutate(newDomain.trim());
  };

  const handleRemoveDomain = async (domain: string) => {
    await removeDomainMutation.mutate(domain);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error && !domains) {
    return (
      <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
        <AlertCircle size={20} />
        <span>{errorMessage}</span>
      </div>
    );
  }

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

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text-primary">Allowed Domains</h3>
        </div>

        <div className="space-y-3">
          {domains?.domains.length === 0 && (
            <div className="text-center py-8 text-theme-text-secondary">
              No domains configured. Add a domain to get started.
            </div>
          )}

          {domains?.domains.map((domain) => (
            <div
              key={domain}
              className="flex items-center justify-between px-4 py-3 bg-theme-bg-secondary rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-theme-text-tertiary" />
                <span className="text-theme-text-primary font-mono">{domain}</span>
              </div>
              <div className="flex items-center gap-2">
                {domain === domains.primaryDomain && (
                  <span className="px-2 py-0.5 text-xs bg-theme-primary/10 text-theme-primary rounded font-medium">
                    {t('services.primary')}
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    disabled={removingDomain}
                    className="p-1 text-theme-status-error-text hover:bg-theme-status-error-bg rounded transition-colors disabled:opacity-50"
                    title={t('common.remove')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {canEdit && (
            <div className="pt-4 border-t border-theme-border-default">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddDomain();
                    }
                  }}
                  placeholder="example.com or localhost:3000"
                  className="flex-1 px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary"
                />
                <Button
                  onClick={handleAddDomain}
                  loading={addingDomain}
                  icon={Plus}
                  size="sm"
                  trackingName="AddServiceDomain"
                >
                  {t('common.add')}
                </Button>
              </div>
              <p className="text-sm text-theme-text-tertiary mt-2">
                Add domains that are allowed to access this service. Include protocol and port if
                needed (e.g., localhost:3000).
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
