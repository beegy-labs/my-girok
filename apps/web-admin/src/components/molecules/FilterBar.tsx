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
      className={`flex flex-wrap items-center gap-4 bg-theme-bg-card border border-theme-border-default rounded-xl p-4 ${className}`}
    >
      {showIcon && <Filter size={18} className="text-theme-text-tertiary" aria-hidden="true" />}
      {children}
      {summary && <div className="ml-auto text-sm text-theme-text-tertiary">{summary}</div>}
    </div>
  ),
);

FilterBar.displayName = 'FilterBar';
