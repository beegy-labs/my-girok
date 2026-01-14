// apps/web-admin/src/components/molecules/FilterBar.tsx
import { memo, ReactNode } from 'react';
import { Filter } from 'lucide-react';

interface FilterBarProps {
  children: ReactNode;
  /** Summary text displayed on the right (e.g., "12 documents") */
  summary?: ReactNode;
  /** Show filter icon on the left */
  showIcon?: boolean;
  className?: string;
}

export const FilterBar = memo<FilterBarProps>(
  ({ children, summary, showIcon = true, className = '' }) => (
    <div
      className={`bg-theme-bg-card border border-theme-border-default rounded-xl p-3 sm:p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1">
          {showIcon && (
            <Filter
              size={18}
              className="text-theme-text-tertiary hidden sm:block"
              aria-hidden="true"
            />
          )}
          {children}
        </div>
        {summary && (
          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {summary}
          </div>
        )}
      </div>
    </div>
  ),
);

FilterBar.displayName = 'FilterBar';
