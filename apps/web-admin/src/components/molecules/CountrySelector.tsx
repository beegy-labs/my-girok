import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { countryConfigApi } from '../../api/countryConfig';

interface CountrySelectorProps {
  value: string | null;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  activeOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export const CountrySelector = memo<CountrySelectorProps>(
  ({ value, onChange, disabled = false, activeOnly = true, placeholder, className = '' }) => {
    const { t } = useTranslation();
    const [countries, setCountries] = useState<
      Array<{ countryCode: string; countryName: string; isActive: boolean }>
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const loadCountries = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await countryConfigApi.list(activeOnly ? { isActive: true } : undefined);
          setCountries(response.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load countries');
          console.error('Failed to load countries:', err);
        } finally {
          setLoading(false);
        }
      };

      loadCountries();
    }, [activeOnly]);

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
                : placeholder || t('countryConfig.countryPlaceholder')}
          </option>
          {countries.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.countryName} ({country.countryCode})
            </option>
          ))}
        </select>
      </div>
    );
  },
);

CountrySelector.displayName = 'CountrySelector';
