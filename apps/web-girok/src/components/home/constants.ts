import {
  Book,
  Calendar,
  FileText,
  Wallet,
  Settings,
  Library,
  Users,
  BarChart3,
  Bell,
} from 'lucide-react';

/**
 * Promo slides configuration
 */
export interface PromoSlide {
  tagKey: string;
  titleKey: string;
  descKey: string;
  ctaKey: string;
}

export const PROMOS: PromoSlide[] = [
  {
    tagKey: 'promo.premium.tag',
    titleKey: 'promo.premium.title',
    descKey: 'promo.premium.desc',
    ctaKey: 'promo.premium.cta',
  },
  {
    tagKey: 'promo.theme.tag',
    titleKey: 'promo.theme.title',
    descKey: 'promo.theme.desc',
    ctaKey: 'promo.theme.cta',
  },
  {
    tagKey: 'promo.mobile.tag',
    titleKey: 'promo.mobile.title',
    descKey: 'promo.mobile.desc',
    ctaKey: 'promo.mobile.cta',
  },
];

/**
 * Menu item configuration
 */
export interface MenuItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
}

/**
 * 9 Menu Functions - Editorial Archive Style (V0.0.1 AAA Workstation)
 */
export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'journal',
    nameKey: 'home.journal.title',
    descriptionKey: 'home.journal.description',
    icon: Book,
    route: '/journal',
    status: 'coming-soon',
  },
  {
    id: 'schedule',
    nameKey: 'home.schedule.title',
    descriptionKey: 'home.schedule.description',
    icon: Calendar,
    route: '/schedule',
    status: 'coming-soon',
  },
  {
    id: 'career',
    nameKey: 'home.career.title',
    descriptionKey: 'home.career.description',
    icon: FileText,
    route: '/resume/my',
    status: 'active',
  },
  {
    id: 'finance',
    nameKey: 'home.finance.title',
    descriptionKey: 'home.finance.description',
    icon: Wallet,
    route: '/finance',
    status: 'coming-soon',
  },
  {
    id: 'settings',
    nameKey: 'home.settings.title',
    descriptionKey: 'home.settings.description',
    icon: Settings,
    route: '/settings',
    status: 'active',
  },
  {
    id: 'library',
    nameKey: 'home.library.title',
    descriptionKey: 'home.library.description',
    icon: Library,
    route: '/library',
    status: 'coming-soon',
  },
  {
    id: 'network',
    nameKey: 'home.network.title',
    descriptionKey: 'home.network.description',
    icon: Users,
    route: '/network',
    status: 'coming-soon',
  },
  {
    id: 'stats',
    nameKey: 'home.stats.title',
    descriptionKey: 'home.stats.description',
    icon: BarChart3,
    route: '/stats',
    status: 'coming-soon',
  },
  {
    id: 'notifications',
    nameKey: 'home.notifications.title',
    descriptionKey: 'home.notifications.description',
    icon: Bell,
    route: '/notifications',
    status: 'coming-soon',
  },
];

/**
 * Widget-enabled menu IDs (can be pinned to top)
 */
export const WIDGET_ENABLED_IDS = ['schedule', 'finance'] as const;
export type WidgetEnabledId = (typeof WIDGET_ENABLED_IDS)[number];
