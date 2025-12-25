// apps/web-admin/src/components/organisms/FormCard.tsx
import { memo, ReactNode, FormHTMLAttributes } from 'react';
import { Card } from '../atoms/Card';

interface FormCardProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'title'> {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export const FormCard = memo<FormCardProps>(
  ({ title, description, children, actions, className = '', ...props }) => (
    <Card className={className}>
      <form {...props}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-theme-text-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-theme-text-secondary">{description}</p>}
        </div>
        <div className="space-y-4">{children}</div>
        {actions && (
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-theme-border">
            {actions}
          </div>
        )}
      </form>
    </Card>
  ),
);

FormCard.displayName = 'FormCard';
