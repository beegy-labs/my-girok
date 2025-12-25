// apps/web-admin/src/components/molecules/StatusBadge.tsx
import { memo } from 'react';
import { Badge } from '../atoms/Badge';

type StatusType = 'active' | 'inactive' | 'pending' | 'error' | 'warning';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusToVariant: Record<StatusType, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
  error: 'error',
  warning: 'warning',
};

const defaultLabels: Record<StatusType, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  error: 'Error',
  warning: 'Warning',
};

export const StatusBadge = memo<StatusBadgeProps>(({ status, label, className = '' }) => (
  <Badge variant={statusToVariant[status]} className={className}>
    {label || defaultLabels[status]}
  </Badge>
));

StatusBadge.displayName = 'StatusBadge';
