import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Loader2, AlertCircle, Globe } from 'lucide-react';
import { servicesApi, ServiceCountry } from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { COUNTRY_OPTIONS } from '../../config/country.config';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';

interface ServiceCountriesTabProps {
  serviceId: string;
}

export default function ServiceCountriesTab({ serviceId }: ServiceCountriesTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('service:update');

  const [countries, setCountries] = useState<ServiceCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceCountriesTab',
    showToast: false,
  });

  const fetchCountries = useCallback(async () => {
    const result = await executeWithErrorHandling(() =>
      servicesApi.listServiceCountries(serviceId),
    );

    if (result) {
      setCountries(result.data);
    }
  }, [serviceId, executeWithErrorHandling]);

  const addCountryMutation = useApiMutation({
    mutationFn: (countryCode: string) => servicesApi.addServiceCountry(serviceId, countryCode),
    successToast: 'Country added successfully',
    onSuccess: () => {
      setSelectedCountry('');
      fetchCountries();
    },
    context: 'AddServiceCountry',
  });

  const removeCountryMutation = useApiMutation({
    mutationFn: (countryCode: string) => servicesApi.removeServiceCountry(serviceId, countryCode),
    successToast: 'Country removed successfully',
    onSuccess: fetchCountries,
    context: 'RemoveServiceCountry',
  });

  const adding = addCountryMutation.isLoading;
  const isRemoving = removeCountryMutation.isLoading;

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const handleAddCountry = async () => {
    if (!selectedCountry) return;
    await addCountryMutation.mutate(selectedCountry);
  };

  const handleRemoveCountry = async (countryCode: string) => {
    await removeCountryMutation.mutate(countryCode);
  };

  // Filter out already added countries
  const availableCountries = COUNTRY_OPTIONS.filter(
    (opt) => !countries.some((c) => c.countryCode === opt.value),
  );

  const getCountryName = (code: string) => {
    const country = COUNTRY_OPTIONS.find((c) => c.value === code);
    return country ? country.label : code;
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
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add Country */}
      {canEdit && availableCountries.length > 0 && (
        <div className="flex items-center gap-3 bg-theme-bg-card border border-theme-border-default rounded-xl p-4">
          <Globe size={20} className="text-theme-text-tertiary" />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="flex-1 px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
          >
            <option value="">{t('services.selectCountry')}</option>
            {availableCountries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCountry}
            disabled={!selectedCountry || adding}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span>{t('services.addCountry')}</span>
          </button>
        </div>
      )}

      {/* Countries List */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
          {t('services.supportedCountries')}
          <span className="ml-2 text-sm font-normal text-theme-text-tertiary">
            ({countries.length})
          </span>
        </h2>

        {countries.length === 0 ? (
          <div className="text-center py-8 text-theme-text-secondary">
            <Globe size={48} className="mx-auto mb-4 text-theme-text-tertiary" />
            <p>{t('services.noCountries')}</p>
            <p className="text-sm mt-1">{t('services.addCountryHint')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {countries.map((country) => (
              <div
                key={country.id}
                className="inline-flex items-center gap-2 px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg"
              >
                <span className="text-lg">{getCountryFlag(country.countryCode)}</span>
                <span className="font-medium text-theme-text-primary">
                  {getCountryName(country.countryCode)}
                </span>
                <span className="text-theme-text-tertiary text-sm">({country.countryCode})</span>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveCountry(country.countryCode)}
                    disabled={isRemoving}
                    className="ml-1 p-1 text-theme-text-tertiary hover:text-theme-status-error-text rounded transition-colors disabled:opacity-50"
                    title={t('common.remove')}
                  >
                    {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
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

function getCountryFlag(countryCode: string): string {
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
