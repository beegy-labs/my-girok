// apps/web-admin/src/components/templates/ListPageTemplate.tsx
import { memo, ReactNode } from 'react';
import { PageHeader } from '../organisms/PageHeader';
import { Card } from '../atoms/Card';

interface ListPageTemplateProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
}

export const ListPageTemplate = memo<ListPageTemplateProps>(
  ({ title, description, actions, filters, children, pagination }) => (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />
      {filters && <Card padding="sm">{filters}</Card>}
      {children}
      {pagination && <div className="mt-6">{pagination}</div>}
    </div>
  ),
);

ListPageTemplate.displayName = 'ListPageTemplate';
