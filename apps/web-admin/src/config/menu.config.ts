import type { LucideIcon } from 'lucide-react';
import { Layers, Info, Cog, Globe, Languages, ClipboardCheck } from 'lucide-react';

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
 * Recovery Menu Configuration - my-girok Phase 1-A
 *
 * Minimal menu structure for service recovery:
 * - Services: Complete service management (metadata, config, domains, countries, locales, consents)
 *
 * All other menus removed for focused recovery workflow.
 * Service detail pages include:
 * 1. Overview: Service metadata (slug, name, description, status)
 * 2. Config: JWT validation, Domain validation toggle, Rate limiting, Maintenance mode, Audit level
 * 3. Domains: Add/remove allowed domains
 * 4. Countries: Add/remove supported countries (active/inactive toggle)
 * 5. Locales: Add/remove supported locales (active/inactive toggle)
 * 6. Consents: Consent requirements matrix per country (required/optional toggle)
 */
export const MENU_CONFIG: MenuItem[] = [
  {
    id: 'services',
    icon: Layers,
    labelKey: 'menu.services',
    permission: 'service:read',
    order: 0,
    parentId: null,
    children: [
      {
        id: 'services-list',
        path: '/services',
        icon: Layers,
        labelKey: 'menu.servicesList',
        order: 0,
      },
      {
        id: 'services-overview',
        path: '/services/:id',
        icon: Info,
        labelKey: 'menu.serviceOverview',
        order: 1,
      },
      {
        id: 'services-config',
        path: '/services/:id/config',
        icon: Cog,
        labelKey: 'menu.serviceConfig',
        order: 2,
      },
      {
        id: 'services-domains',
        path: '/services/:id/domains',
        icon: Globe,
        labelKey: 'menu.serviceDomains',
        order: 3,
      },
      {
        id: 'services-countries',
        path: '/services/:id/countries',
        icon: Globe,
        labelKey: 'menu.serviceCountries',
        order: 4,
      },
      {
        id: 'services-locales',
        path: '/services/:id/locales',
        icon: Languages,
        labelKey: 'menu.serviceLocales',
        order: 5,
      },
      {
        id: 'services-consents',
        path: '/services/:id/consents',
        icon: ClipboardCheck,
        labelKey: 'menu.serviceConsents',
        order: 6,
      },
    ],
  },
];

export const MAX_MENU_DEPTH = 5;
