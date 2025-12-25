// apps/web-admin/src/components/molecules/FilterBar.tsx
import { memo, ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export const FilterBar = memo<FilterBarProps>(({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-4 ${className}`}>{children}</div>
));

FilterBar.displayName = 'FilterBar';
