import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

interface IpWhitelistInputProps {
  value: string[];
  onChange: (ips: string[]) => void;
  disabled?: boolean;
  className?: string;
}

const IP_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$/;

export const IpWhitelistInput = memo<IpWhitelistInputProps>(
  ({ value, onChange, disabled = false, className = '' }) => {
    const { t } = useTranslation();
    const [newIp, setNewIp] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validateIp = useCallback((ip: string): boolean => {
      return IP_REGEX.test(ip);
    }, []);

    const handleAdd = useCallback(() => {
      const trimmedIp = newIp.trim();

      if (!trimmedIp) {
        return;
      }

      if (!validateIp(trimmedIp)) {
        setError(t('serviceConfig.invalidIpAddress'));
        return;
      }

      if (value.includes(trimmedIp)) {
        setError(t('serviceConfig.ipExists'));
        return;
      }

      onChange([...value, trimmedIp]);
      setNewIp('');
      setError(null);
    }, [newIp, value, onChange, validateIp, t]);

    const handleRemove = useCallback(
      (ip: string) => {
        onChange(value.filter((item) => item !== ip));
      },
      [value, onChange],
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
            value={newIp}
            onChange={(e) => {
              setNewIp(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('serviceConfig.ipPlaceholder')}
            disabled={disabled}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={disabled || !newIp.trim()} size="sm">
            <Plus size={16} />
          </Button>
        </div>

        {error && <p className="text-sm text-theme-error mb-2">{error}</p>}

        <div className="space-y-2">
          {value.map((ip) => (
            <div
              key={ip}
              className="flex items-center justify-between p-2 bg-theme-bg-secondary rounded border border-theme-border"
            >
              <span className="text-sm font-mono">{ip}</span>
              <button
                onClick={() => handleRemove(ip)}
                disabled={disabled}
                className="text-theme-text-tertiary hover:text-theme-error disabled:opacity-50"
                aria-label={t('serviceConfig.removeIpAddress')}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {value.length === 0 && (
          <p className="text-sm text-theme-text-tertiary text-center py-4">
            {t('serviceConfig.ipAddresses')}
          </p>
        )}
      </div>
    );
  },
);

IpWhitelistInput.displayName = 'IpWhitelistInput';
