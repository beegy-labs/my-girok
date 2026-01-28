import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Info, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { servicesApi, Service } from '../../api/services';
import { Card } from '../../components/atoms/Card';
import { useApiError } from '../../hooks/useApiError';

interface ServiceOverviewTabProps {
  serviceId: string;
}

export default function ServiceOverviewTab({ serviceId }: ServiceOverviewTabProps) {
  const { t } = useTranslation();
  const [service, setService] = useState<Service | null>(null);

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceOverviewTab',
    showToast: false,
  });

  const fetchService = useCallback(async () => {
    const result = await executeWithErrorHandling(() => servicesApi.getService(serviceId));
    if (result) {
      setService(result);
    }
  }, [serviceId, executeWithErrorHandling]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
        <AlertCircle size={20} />
        <span>{errorMessage || t('services.notFound')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Info size={20} className="text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text-primary">Service Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Service Name
            </label>
            <div className="text-theme-text-primary font-medium">{service.name}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Service Slug
            </label>
            <code className="px-2 py-1 bg-theme-bg-secondary rounded text-theme-text-primary">
              {service.slug}
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Status
            </label>
            <div>
              {service.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <CheckCircle size={14} />
                  {t('common.active')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  <XCircle size={14} />
                  {t('common.inactive')}
                </span>
              )}
            </div>
          </div>

          {service.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Description
              </label>
              <div className="text-theme-text-primary">{service.description}</div>
            </div>
          )}

          {service.settings && (
            <>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  Version
                </label>
                <div className="text-theme-text-primary">{service.settings.version || 'N/A'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  Type
                </label>
                <div className="text-theme-text-primary">{service.settings.type || 'N/A'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  Category
                </label>
                <div className="text-theme-text-primary">{service.settings.category || 'N/A'}</div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              <Calendar size={16} className="inline mr-1" />
              Created
            </label>
            <div className="text-theme-text-primary">
              {new Date(service.createdAt).toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              <Calendar size={16} className="inline mr-1" />
              Last Updated
            </label>
            <div className="text-theme-text-primary">
              {new Date(service.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
