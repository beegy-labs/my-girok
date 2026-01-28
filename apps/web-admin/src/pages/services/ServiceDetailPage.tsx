import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Globe,
  ClipboardList,
  Languages,
  Settings,
  CheckCircle,
  XCircle,
  Cog,
  Info,
} from 'lucide-react';
import { servicesApi, Service } from '../../api/services';
import ServiceOverviewTab from './ServiceOverviewTab';
import ServiceConfigTab from './ServiceConfigTab';
import ServiceDomainsTab from './ServiceDomainsTab';
import ServiceCountriesTab from './ServiceCountriesTab';
import ServiceLocalesTab from './ServiceLocalesTab';
import ServiceConsentsTab from './ServiceConsentsTab';
import { useAuditEvent } from '../../hooks';
import { useApiError } from '../../hooks/useApiError';

type TabType = 'overview' | 'config' | 'domains' | 'countries' | 'locales' | 'consents';

export default function ServiceDetailPage() {
  const { t } = useTranslation();
  const { serviceId } = useParams<{ serviceId: string }>();
  const { trackTabChange } = useAuditEvent();
  const [service, setService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceDetailPage',
    showToast: false,
  });

  const handleTabChange = (tab: TabType) => {
    trackTabChange(tab, activeTab);
    setActiveTab(tab);
  };

  const fetchService = useCallback(async () => {
    if (!serviceId) return;

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

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('menu.serviceOverview'), icon: <Info size={18} /> },
    { id: 'config', label: t('menu.serviceConfig'), icon: <Cog size={18} /> },
    { id: 'domains', label: t('menu.serviceDomains'), icon: <Globe size={18} /> },
    { id: 'countries', label: t('menu.serviceCountries'), icon: <Globe size={18} /> },
    { id: 'locales', label: t('menu.serviceLocales'), icon: <Languages size={18} /> },
    { id: 'consents', label: t('menu.serviceConsents'), icon: <ClipboardList size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/services"
          className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text-secondary" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-theme-bg-secondary rounded-lg flex items-center justify-center">
              <Settings size={24} className="text-theme-text-tertiary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-text-primary">{service.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <code className="px-2 py-0.5 bg-theme-bg-secondary rounded text-sm text-theme-text-secondary">
                  {service.slug}
                </code>
                {service.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    <CheckCircle size={12} />
                    {t('common.active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                    <XCircle size={12} />
                    {t('common.inactive')}
                  </span>
                )}
              </div>
            </div>
          </div>
          {service.description && (
            <p className="text-theme-text-secondary mt-2 ml-15">{service.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-theme-border-default overflow-x-auto">
        <nav className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary'
              }`}
            >
              {tab.icon}
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <ServiceOverviewTab serviceId={serviceId!} />}
        {activeTab === 'config' && <ServiceConfigTab serviceId={serviceId!} />}
        {activeTab === 'domains' && <ServiceDomainsTab serviceId={serviceId!} />}
        {activeTab === 'countries' && <ServiceCountriesTab serviceId={serviceId!} />}
        {activeTab === 'locales' && <ServiceLocalesTab serviceId={serviceId!} />}
        {activeTab === 'consents' && <ServiceConsentsTab serviceId={serviceId!} />}
      </div>
    </div>
  );
}
