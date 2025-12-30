import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import { Plus, X, Loader2, AlertCircle, Languages } from 'lucide-react';
import { servicesApi, ServiceLocale } from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { LOCALES } from '../../config/legal.config';

interface ServiceLocalesTabProps {
  serviceId: string;
}

export default function ServiceLocalesTab({ serviceId }: ServiceLocalesTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('service:update');

  const [locales, setLocales] = useState<ServiceLocale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState('');

  const fetchLocales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await servicesApi.listServiceLocales(serviceId);
      setLocales(result.data);
    } catch (err) {
      setError(t('services.loadLocalesFailed'));
      logger.error('Failed to fetch service locales', { serviceId, error: err });
    } finally {
      setLoading(false);
    }
  }, [serviceId, t]);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  const handleAddLocale = async () => {
    if (!selectedLocale) return;

    setAdding(true);
    setError(null);

    try {
      await servicesApi.addServiceLocale(serviceId, selectedLocale);
      setSelectedLocale('');
      fetchLocales();
    } catch (err) {
      setError(t('services.addLocaleFailed'));
      logger.error('Failed to add service locale', {
        serviceId,
        locale: selectedLocale,
        error: err,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveLocale = async (locale: string) => {
    setRemoving(locale);
    setError(null);

    try {
      await servicesApi.removeServiceLocale(serviceId, locale);
      fetchLocales();
    } catch (err) {
      setError(t('services.removeLocaleFailed'));
      logger.error('Failed to remove service locale', { serviceId, locale, error: err });
    } finally {
      setRemoving(null);
    }
  };

  // Filter out already added locales
  const availableLocales = LOCALES.filter((opt) => !locales.some((l) => l.locale === opt.value));

  const getLocaleName = (code: string) => {
    const locale = LOCALES.find((l) => l.value === code);
    return locale ? `${locale.flag} ${t(locale.labelKey)}` : code;
  };

  const getLocaleFlag = (code: string) => {
    const locale = LOCALES.find((l) => l.value === code);
    return locale ? locale.flag : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Add Locale */}
      {canEdit && availableLocales.length > 0 && (
        <div className="flex items-center gap-3 bg-theme-bg-card border border-theme-border-default rounded-xl p-4">
          <Languages size={20} className="text-theme-text-tertiary" />
          <select
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value)}
            className="flex-1 px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
          >
            <option value="">{t('services.selectLocale')}</option>
            {availableLocales.map((locale) => (
              <option key={locale.value} value={locale.value}>
                {locale.flag} {t(locale.labelKey)}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddLocale}
            disabled={!selectedLocale || adding}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span>{t('services.addLocale')}</span>
          </button>
        </div>
      )}

      {/* Locales List */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
          {t('services.supportedLocales')}
          <span className="ml-2 text-sm font-normal text-theme-text-tertiary">
            ({locales.length})
          </span>
        </h2>

        {locales.length === 0 ? (
          <div className="text-center py-8 text-theme-text-secondary">
            <Languages size={48} className="mx-auto mb-4 text-theme-text-tertiary" />
            <p>{t('services.noLocales')}</p>
            <p className="text-sm mt-1">{t('services.addLocaleHint')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locales.map((locale) => (
              <div
                key={locale.id}
                className="inline-flex items-center gap-2 px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg"
              >
                <span className="text-lg">{getLocaleFlag(locale.locale)}</span>
                <span className="font-medium text-theme-text-primary">
                  {getLocaleName(locale.locale)}
                </span>
                <span className="text-theme-text-tertiary text-sm">({locale.locale})</span>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveLocale(locale.locale)}
                    disabled={removing === locale.locale}
                    className="ml-1 p-1 text-theme-text-tertiary hover:text-theme-status-error-text rounded transition-colors disabled:opacity-50"
                    title={t('common.remove')}
                  >
                    {removing === locale.locale ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
