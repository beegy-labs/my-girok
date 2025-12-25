// apps/web-admin/src/components/molecules/DateRangePicker.tsx
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { Input } from '../atoms/Input';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export const DateRangePicker = memo<DateRangePickerProps>(
  ({ startDate, endDate, onStartDateChange, onEndDateChange, className = '' }) => {
    const { t } = useTranslation();

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Input
          type="date"
          icon={Calendar}
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          placeholder={t('common.startDate')}
        />
        <span className="text-theme-text-tertiary">-</span>
        <Input
          type="date"
          icon={Calendar}
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          placeholder={t('common.endDate')}
        />
      </div>
    );
  },
);

DateRangePicker.displayName = 'DateRangePicker';
