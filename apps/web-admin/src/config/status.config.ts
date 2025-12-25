// apps/web-admin/src/config/status.config.ts
import type { BadgeVariant } from '../components/atoms/Badge';

/**
 * Universal status configuration using theme tokens
 * NOT Tailwind color classes like 'text-yellow-600'
 */
export interface StatusStyleConfig {
  variant: BadgeVariant;
}

export const DOCUMENT_STATUS: Record<'active' | 'inactive', StatusStyleConfig> = {
  active: { variant: 'success' },
  inactive: { variant: 'default' },
};

export const CONSENT_STATUS: Record<'agreed' | 'pending' | 'withdrawn', StatusStyleConfig> = {
  agreed: { variant: 'success' },
  pending: { variant: 'warning' },
  withdrawn: { variant: 'error' },
};

export const AUDIT_ACTION_STATUS: Record<string, StatusStyleConfig> = {
  CREATE: { variant: 'success' },
  UPDATE: { variant: 'info' },
  DELETE: { variant: 'error' },
  LOGIN: { variant: 'info' },
  LOGOUT: { variant: 'default' },
};
