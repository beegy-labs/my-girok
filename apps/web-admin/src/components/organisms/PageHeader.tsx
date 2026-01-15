// apps/web-admin/src/components/organisms/PageHeader.tsx
import { memo, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = memo<PageHeaderProps>(({ title, description, actions }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 flex-1">
      <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary truncate">{title}</h1>
      {description && (
        <p className="text-sm sm:text-base text-theme-text-secondary mt-1">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">{actions}</div>}
  </div>
));

PageHeader.displayName = 'PageHeader';
