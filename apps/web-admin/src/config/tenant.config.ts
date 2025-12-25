// apps/web-admin/src/config/tenant.config.ts
import {
  Clock,
  CheckCircle,
  Ban,
  XCircle,
  Building2,
  ShoppingCart,
  Megaphone,
  Link,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { BadgeVariant } from '../components/atoms/Badge';
import type {
  TenantStatus as TenantStatusType,
  TenantType as TenantTypeEnum,
} from '@my-girok/types';

// Re-export types from SSOT package
export type TenantStatus = TenantStatusType;
export type TenantType = TenantTypeEnum;

interface StatusConfig {
  value: TenantStatus;
  labelKey: string;
  icon: LucideIcon;
  variant: BadgeVariant;
}

interface TenantTypeConfig {
  value: TenantType;
  labelKey: string;
  icon: LucideIcon;
}

export const TENANT_STATUSES: StatusConfig[] = [
  { value: 'PENDING', labelKey: 'tenants.statusPending', icon: Clock, variant: 'warning' },
  { value: 'ACTIVE', labelKey: 'tenants.statusActive', icon: CheckCircle, variant: 'success' },
  { value: 'SUSPENDED', labelKey: 'tenants.statusSuspended', icon: Ban, variant: 'error' },
  { value: 'TERMINATED', labelKey: 'tenants.statusTerminated', icon: XCircle, variant: 'default' },
];

export const TENANT_TYPES: TenantTypeConfig[] = [
  { value: 'INTERNAL', labelKey: 'tenants.typeInternal', icon: Building2 },
  { value: 'COMMERCE', labelKey: 'tenants.typeCommerce', icon: ShoppingCart },
  { value: 'ADBID', labelKey: 'tenants.typeAdbid', icon: Megaphone },
  { value: 'POSTBACK', labelKey: 'tenants.typePostback', icon: Link },
  { value: 'AGENCY', labelKey: 'tenants.typeAgency', icon: Users },
];

export function getStatusConfig(status: TenantStatus): StatusConfig {
  return TENANT_STATUSES.find((s) => s.value === status) || TENANT_STATUSES[0];
}

export function getTenantTypeConfig(type: TenantType): TenantTypeConfig {
  return TENANT_TYPES.find((t) => t.value === type) || TENANT_TYPES[0];
}

export function getStatusOptions(t: (key: string) => string, includeAll = true) {
  const options = TENANT_STATUSES.map((s) => ({
    value: s.value,
    label: t(s.labelKey),
  }));
  return includeAll ? [{ value: '', label: t('common.allStatus') }, ...options] : options;
}

export function getTenantTypeOptions(t: (key: string) => string, includeAll = true) {
  const options = TENANT_TYPES.map((t_) => ({
    value: t_.value,
    label: t(t_.labelKey),
  }));
  return includeAll ? [{ value: '', label: t('common.allTypes') }, ...options] : options;
}
