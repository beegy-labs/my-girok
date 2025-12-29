import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Globe,
  Building2,
  ClipboardList,
  Layers,
  Shield,
  Settings2,
  Grid3X3,
  ClipboardCheck,
  Cog,
  Languages,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  path?: string;
  icon?: LucideIcon;
  labelKey: string;
  permission?: string;
  children?: MenuItem[];
  badge?: 'new' | 'beta';
  /** For future dynamic menu configuration */
  order?: number;
  /** Parent menu ID for dynamic restructuring */
  parentId?: string | null;
}

/**
 * SSOT Menu Configuration - 2025 Best Practices
 *
 * Structure:
 * - Dashboard: Overview and quick access
 * - Services: Service management (N services, countries, consents)
 * - Compliance: Legal documents, consent history, analytics, regional rules
 * - Organization: Partners (tenants), operators (future)
 * - System: Audit logs, settings, menu config (future)
 *
 * Supports up to 5 depth levels with permission-based filtering
 * Designed for future dynamic menu configuration from admin settings
 */
export const MENU_CONFIG: MenuItem[] = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    labelKey: 'menu.dashboard',
    order: 0,
    parentId: null,
  },
  {
    id: 'services',
    icon: Layers,
    labelKey: 'menu.services',
    permission: 'service:read',
    order: 1,
    parentId: null,
    children: [
      {
        id: 'services-list',
        path: '/services',
        icon: Grid3X3,
        labelKey: 'menu.servicesList',
        order: 0,
      },
    ],
  },
  {
    id: 'compliance',
    icon: Shield,
    labelKey: 'menu.compliance',
    permission: 'legal:read',
    order: 2,
    parentId: null,
    children: [
      {
        id: 'compliance-documents',
        path: '/compliance/documents',
        icon: FileText,
        labelKey: 'menu.documents',
        order: 0,
      },
      {
        id: 'compliance-consents',
        path: '/compliance/consents',
        icon: ClipboardCheck,
        labelKey: 'menu.consentHistory',
        order: 1,
      },
      {
        id: 'compliance-analytics',
        path: '/compliance/analytics',
        icon: BarChart3,
        labelKey: 'menu.analytics',
        order: 2,
      },
      {
        id: 'compliance-regions',
        path: '/compliance/regions',
        icon: Globe,
        labelKey: 'menu.regionalRules',
        order: 3,
      },
    ],
  },
  {
    id: 'organization',
    icon: Building2,
    labelKey: 'menu.organization',
    permission: 'tenant:read',
    order: 3,
    parentId: null,
    children: [
      {
        id: 'organization-partners',
        path: '/organization/partners',
        icon: Users,
        labelKey: 'menu.partners',
        order: 0,
      },
    ],
  },
  {
    id: 'system',
    icon: Settings2,
    labelKey: 'menu.system',
    order: 4,
    parentId: null,
    children: [
      {
        id: 'system-countries',
        path: '/system/countries',
        icon: Globe,
        labelKey: 'menu.supportedCountries',
        permission: 'settings:read',
        order: 0,
      },
      {
        id: 'system-locales',
        path: '/system/locales',
        icon: Languages,
        labelKey: 'menu.supportedLocales',
        permission: 'settings:read',
        order: 1,
      },
      {
        id: 'system-audit',
        path: '/system/audit-logs',
        icon: ClipboardList,
        labelKey: 'menu.auditLogs',
        permission: 'audit:read',
        order: 2,
      },
      {
        id: 'system-settings',
        path: '/system/settings',
        icon: Cog,
        labelKey: 'menu.settings',
        order: 3,
      },
    ],
  },
];

export const MAX_MENU_DEPTH = 5;
