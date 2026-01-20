import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { servicesApi } from '../../api/services';

interface ServiceSelectorProps {
  value: string | null;
  onChange: (serviceId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ServiceSelector = memo<ServiceSelectorProps>(
  ({ value, onChange, disabled = false, placeholder, className = '' }) => {
    const { t } = useTranslation();
    const [services, setServices] = useState<Array<{ id: string; name: string; slug: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const loadServices = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await servicesApi.listServices({ isActive: true });
          setServices(response.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load services');
          console.error('Failed to load services:', err);
        } finally {
          setLoading(false);
        }
      };

      loadServices();
    }, []);

    return (
      <div className={className}>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
        >
          <option value="">
            {loading
              ? t('common.loading')
              : error
                ? t('common.error')
                : placeholder || t('serviceConfig.servicePlaceholder')}
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ({service.slug})
            </option>
          ))}
        </select>
      </div>
    );
  },
);

ServiceSelector.displayName = 'ServiceSelector';
