// apps/web-admin/src/components/organisms/PageHeader.tsx
import { memo, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = memo<PageHeaderProps>(({ title, description, actions }) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-theme-text-primary">{title}</h1>
      {description && <p className="text-theme-text-secondary mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
));

PageHeader.displayName = 'PageHeader';
