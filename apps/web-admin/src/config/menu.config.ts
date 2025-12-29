import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Scale,
  FileText,
  Users,
  BarChart3,
  Globe,
  Building2,
  ClipboardList,
  Settings,
  Layers,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  path?: string;
  icon?: LucideIcon;
  labelKey: string;
  permission?: string;
  children?: MenuItem[];
  badge?: 'new' | 'beta';
}

/**
 * SSOT Menu Configuration
 * Supports up to 5 depth levels with permission-based filtering
 */
export const MENU_CONFIG: MenuItem[] = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    labelKey: 'menu.dashboard',
  },
  {
    id: 'legal',
    icon: Scale,
    labelKey: 'menu.legal',
    permission: 'legal:read',
    children: [
      {
        id: 'legal-documents',
        path: '/legal/documents',
        icon: FileText,
        labelKey: 'menu.legalDocuments',
      },
      {
        id: 'legal-consents',
        path: '/legal/consents',
        icon: Users,
        labelKey: 'menu.consents',
      },
      {
        id: 'legal-stats',
        path: '/legal/consent-stats',
        icon: BarChart3,
        labelKey: 'menu.consentStats',
        badge: 'new',
      },
      {
        id: 'legal-examples',
        path: '/legal/examples',
        icon: Globe,
        labelKey: 'menu.countryExamples',
      },
    ],
  },
  {
    id: 'services',
    path: '/services',
    icon: Layers,
    labelKey: 'menu.services',
    permission: 'service:read',
  },
  {
    id: 'tenants',
    path: '/tenants',
    icon: Building2,
    labelKey: 'menu.tenants',
    permission: 'tenant:read',
  },
  {
    id: 'audit',
    path: '/audit-logs',
    icon: ClipboardList,
    labelKey: 'menu.auditLogs',
    permission: 'audit:read',
  },
  {
    id: 'settings',
    path: '/settings',
    icon: Settings,
    labelKey: 'menu.settings',
  },
];

export const MAX_MENU_DEPTH = 5;
