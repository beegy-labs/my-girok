// apps/web-admin/src/components/molecules/SearchInput.tsx
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '../atoms/Input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput = memo<SearchInputProps>(
  ({ value, onChange, placeholder, className = '' }) => {
    const { t } = useTranslation();

    const handleClear = useCallback(() => {
      onChange('');
    }, [onChange]);

    return (
      <div className={`relative ${className}`}>
        <Input
          icon={Search}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t('common.search')}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
