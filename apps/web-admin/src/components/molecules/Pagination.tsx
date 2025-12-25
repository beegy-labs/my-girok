// apps/web-admin/src/components/molecules/Pagination.tsx
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  limit?: number;
}

export const Pagination = memo<PaginationProps>(
  ({ page, totalPages, onPageChange, total, limit = 20 }) => {
    const { t } = useTranslation();
    if (totalPages <= 1) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total || page * limit);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          {t('common.previous')}
        </Button>
        <span className="text-sm text-theme-text-secondary">
          {total
            ? t('common.showing', { from, to, total })
            : t('common.page', { current: page, total: totalPages })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronRight}
          iconPosition="right"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          {t('common.next')}
        </Button>
      </div>
    );
  },
);

Pagination.displayName = 'Pagination';
