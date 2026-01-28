import type { LucideIcon } from 'lucide-react';
import { Layers } from 'lucide-react';

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
 * Service detail page includes internal tab navigation for:
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
    path: '/services',
    icon: Layers,
    labelKey: 'menu.services',
    permission: 'service:read',
    order: 0,
    parentId: null,
  },
];

export const MAX_MENU_DEPTH = 5;
