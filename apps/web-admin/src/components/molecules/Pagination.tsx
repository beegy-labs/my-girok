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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span className="text-xs sm:text-sm text-theme-text-secondary order-first sm:order-none mb-2 sm:mb-0">
          {total
            ? t('common.showing', { from, to, total })
            : t('common.page', { current: page, total: totalPages })}
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex-1 sm:flex-none"
            aria-label={t('common.previous')}
          >
            <span className="hidden sm:inline">{t('common.previous')}</span>
            <span className="sm:hidden">{t('common.prev')}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronRight}
            iconPosition="right"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex-1 sm:flex-none"
            aria-label={t('common.next')}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    );
  },
);

Pagination.displayName = 'Pagination';
