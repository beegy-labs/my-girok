import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Star } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

interface DomainListManagerProps {
  domains: string[];
  primaryDomain?: string;
  onChange: (domains: string[]) => void;
  onPrimaryChange: (domain: string) => void;
  disabled?: boolean;
  className?: string;
}

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export const DomainListManager = memo<DomainListManagerProps>(
  ({ domains, primaryDomain, onChange, onPrimaryChange, disabled = false, className = '' }) => {
    const { t } = useTranslation();
    const [newDomain, setNewDomain] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validateDomain = useCallback((domain: string): boolean => {
      return DOMAIN_REGEX.test(domain);
    }, []);

    const handleAdd = useCallback(() => {
      const trimmedDomain = newDomain.trim().toLowerCase();

      if (!trimmedDomain) {
        return;
      }

      if (!validateDomain(trimmedDomain)) {
        setError(t('serviceConfig.invalidDomain'));
        return;
      }

      if (domains.includes(trimmedDomain)) {
        setError(t('serviceConfig.domainExists'));
        return;
      }

      const updatedDomains = [...domains, trimmedDomain];
      onChange(updatedDomains);

      // Set as primary if it's the first domain
      if (updatedDomains.length === 1) {
        onPrimaryChange(trimmedDomain);
      }

      setNewDomain('');
      setError(null);
    }, [newDomain, domains, onChange, onPrimaryChange, validateDomain, t]);

    const handleRemove = useCallback(
      (domain: string) => {
        const updatedDomains = domains.filter((item) => item !== domain);
        onChange(updatedDomains);

        // If removing primary domain, set the first remaining domain as primary
        if (domain === primaryDomain && updatedDomains.length > 0) {
          onPrimaryChange(updatedDomains[0]);
        } else if (updatedDomains.length === 0) {
          onPrimaryChange('');
        }
      },
      [domains, primaryDomain, onChange, onPrimaryChange],
    );

    const handleSetPrimary = useCallback(
      (domain: string) => {
        onPrimaryChange(domain);
      },
      [onPrimaryChange],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdd();
        }
      },
      [handleAdd],
    );

    return (
      <div className={className}>
        <div className="flex gap-2 mb-2">
          <Input
            value={newDomain}
            onChange={(e) => {
              setNewDomain(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('serviceConfig.domainPlaceholder')}
            disabled={disabled}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={disabled || !newDomain.trim()} size="sm">
            <Plus size={16} />
          </Button>
        </div>

        {error && <p className="text-sm text-theme-error mb-2">{error}</p>}

        <div className="space-y-2">
          {domains.map((domain) => {
            const isPrimary = domain === primaryDomain;
            return (
              <div
                key={domain}
                className={`flex items-center justify-between p-2 rounded border ${
                  isPrimary
                    ? 'bg-theme-primary/10 border-theme-primary'
                    : 'bg-theme-bg-secondary border-theme-border'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => handleSetPrimary(domain)}
                    disabled={disabled || isPrimary}
                    className={`${
                      isPrimary
                        ? 'text-theme-primary'
                        : 'text-theme-text-tertiary hover:text-theme-primary'
                    } disabled:opacity-50`}
                    aria-label={t('serviceConfig.setPrimary')}
                    title={
                      isPrimary ? t('serviceConfig.primaryDomain') : t('serviceConfig.setPrimary')
                    }
                  >
                    <Star size={16} fill={isPrimary ? 'currentColor' : 'none'} />
                  </button>
                  <span className="text-sm font-mono">{domain}</span>
                  {isPrimary && (
                    <span className="text-xs text-theme-primary font-medium">
                      {t('serviceConfig.primaryDomain')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(domain)}
                  disabled={disabled}
                  className="text-theme-text-tertiary hover:text-theme-error disabled:opacity-50"
                  aria-label={t('serviceConfig.removeDomain')}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {domains.length === 0 && (
          <p className="text-sm text-theme-text-tertiary text-center py-4">
            {t('serviceConfig.domains')}
          </p>
        )}
      </div>
    );
  },
);

DomainListManager.displayName = 'DomainListManager';
