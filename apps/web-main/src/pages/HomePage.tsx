import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { generateWebsiteSchema } from '../utils/structuredData';
import {
  Button,
  MenuCard,
  MenuRow,
  ViewToggle,
  SectionBadge,
  TopWidget,
  type ViewMode,
} from '@my-girok/ui-components';
import Footer from '../components/Footer';
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
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  GripVertical,
} from 'lucide-react';

interface MenuItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
}

// 9 Menu Functions - Editorial Archive Style (V0.0.1 AAA Workstation)
const MENU_ITEMS: MenuItem[] = [
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

// Widget-enabled menu IDs (can be pinned to top)
const WIDGET_ENABLED_IDS = ['schedule', 'finance'] as const;

// Promo slides - V0.0.1 mockup style (i18n keys)
const PROMOS = [
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
 * HomePage - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [pinnedWidgetId, setPinnedWidgetId] = useState<string | null>(null);
  const [currentPromo, setCurrentPromo] = useState(0);

  // Memoized pinned widget data
  const pinnedWidget = useMemo(
    () => MENU_ITEMS.find((item) => item.id === pinnedWidgetId),
    [pinnedWidgetId],
  );

  // Curried handlers (2025 React best practice - no inline functions in map)
  const handleMenuClick = useCallback(
    (menu: MenuItem) => () => {
      if (menu.status === 'active') {
        navigate(menu.route);
      }
    },
    [navigate],
  );

  // Pin/unpin widget handler (curried)
  const handlePinWidget = useCallback(
    (menuId: string) => () => {
      setPinnedWidgetId((prev) => (prev === menuId ? null : menuId));
    },
    [],
  );

  // Check if a menu can be pinned as widget
  const canPinAsWidget = useCallback(
    (menuId: string) => WIDGET_ENABLED_IDS.includes(menuId as (typeof WIDGET_ENABLED_IDS)[number]),
    [],
  );

  // Promo carousel handlers
  const handlePrevPromo = useCallback(() => {
    setCurrentPromo((prev) => (prev - 1 + PROMOS.length) % PROMOS.length);
  }, []);

  const handleNextPromo = useCallback(() => {
    setCurrentPromo((prev) => (prev + 1) % PROMOS.length);
  }, []);

  return (
    <>
      <SEO
        title={isAuthenticated ? `${user?.name || user?.username}'s Archive` : undefined}
        description={t('seo.homeDescription', {
          defaultValue:
            'Create, manage, and share your professional resume with girok. Build your career profile, track your achievements, and share your professional story with the world.',
        })}
        keywords={[
          'resume builder',
          'cv creator',
          'professional profile',
          'career management',
          'job search tools',
          'online portfolio',
          'career tracking',
        ]}
        url="https://www.mygirok.com"
        type="website"
        structuredData={generateWebsiteSchema()}
      />

      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        {t('aria.skipToMainContent', { defaultValue: 'Skip to main content' })}
      </a>

      <main
        id="main-content"
        className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-700 pt-nav"
        role="main"
      >
        {isAuthenticated ? (
          /* Authenticated Dashboard - V0.0.1 Style */
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
            {/* Promo Carousel Section - V0.0.1 Style */}
            <section
              className="mb-16"
              aria-label={t('aria.featuredPromotions', { defaultValue: 'Featured Promotions' })}
            >
              <div className="relative group w-full h-[300px] rounded-editorial-xl border-2 border-theme-border-default bg-theme-bg-card shadow-theme-md overflow-hidden p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-10 transition-all hover:border-theme-primary focus-within:ring-[4px] focus-within:ring-theme-focus-ring">
                <div className="flex-1 flex flex-col justify-center h-full" key={currentPromo}>
                  <span className="text-[12px] font-black uppercase tracking-brand text-theme-primary mb-4 block font-mono-brand">
                    {t(PROMOS[currentPromo].tagKey, { defaultValue: 'Premium' })}
                  </span>
                  <h2 className="text-3xl sm:text-5xl text-theme-text-primary mb-6 leading-tight font-serif-title">
                    {t(PROMOS[currentPromo].titleKey, { defaultValue: 'Gold Edition.' })}
                  </h2>
                  <p className="text-lg font-bold text-theme-text-secondary mb-10 leading-relaxed max-w-xl">
                    {t(PROMOS[currentPromo].descKey, {
                      defaultValue: 'Unlimited storage and enhanced security.',
                    })}
                  </p>
                  <button
                    type="button"
                    className="text-[12px] font-black uppercase tracking-brand-sm text-theme-primary border-b-2 border-theme-primary pb-2 hover:opacity-80 transition-all w-fit min-h-[44px]"
                    aria-label={t('aria.viewPromoDetails', { defaultValue: 'View promo details' })}
                  >
                    {t(PROMOS[currentPromo].ctaKey, { defaultValue: 'Learn More' })}
                  </button>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handlePrevPromo}
                    className="p-5 border-2 border-theme-border-default rounded-full hover:bg-theme-bg-secondary focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring transition-all shadow-theme-sm min-w-[56px] min-h-[56px] flex items-center justify-center"
                    aria-label={t('aria.previousPromo', { defaultValue: 'Previous Promo' })}
                  >
                    <ChevronLeft size={24} aria-hidden="true" />
                  </button>
                  <button
                    onClick={handleNextPromo}
                    className="p-5 border-2 border-theme-border-default rounded-full hover:bg-theme-bg-secondary focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring transition-all shadow-theme-sm min-w-[56px] min-h-[56px] flex items-center justify-center"
                    aria-label={t('aria.nextPromo', { defaultValue: 'Next Promo' })}
                  >
                    <ChevronRight size={24} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            {/* Workstation Section - V0.0.1 Style */}
            <section
              className="mb-20"
              aria-label={t('aria.workstationControls', { defaultValue: 'Workstation Controls' })}
            >
              <div className="p-10 md:p-14 rounded-editorial-2xl bg-theme-bg-secondary border-2 border-theme-border-default shadow-theme-sm">
                {/* Workstation Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12 border-b-2 border-theme-border-default pb-10">
                  <div className="flex items-center gap-6">
                    <div
                      className="p-5 bg-theme-bg-card rounded-input border-2 border-theme-border-default text-theme-primary shadow-theme-sm"
                      aria-hidden="true"
                    >
                      <Layers size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-theme-text-primary">
                        {t('home.workstation', { defaultValue: 'Workstation' })}
                      </h2>
                      <p className="text-[12px] font-bold text-theme-text-secondary uppercase tracking-brand-sm mt-2 font-mono-brand">
                        {t('home.activeWorkspace', { defaultValue: 'Active Workspace' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="editorial"
                    icon={<Plus size={18} strokeWidth={1.5} />}
                    aria-label={t('home.addWidget', { defaultValue: 'Add new widget' })}
                  >
                    {t('home.add', { defaultValue: 'Add' })}
                  </Button>
                </div>

                {/* Widget Grid - V0.0.1 Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Today Widget - Active */}
                  <article className="bg-theme-bg-card rounded-editorial-lg border-2 border-theme-border-default shadow-theme-sm p-10 flex flex-col group hover:border-theme-primary transition-all relative overflow-hidden focus-within:ring-[4px] focus-within:ring-theme-focus-ring">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div
                          className="p-3 bg-theme-bg-secondary rounded-xl text-theme-primary border border-theme-border-subtle"
                          aria-hidden="true"
                        >
                          <Calendar size={20} />
                        </div>
                        <h3 className="text-[14px] font-black text-theme-text-primary uppercase tracking-brand-sm font-mono-brand">
                          {t('home.today', { defaultValue: 'Today' })}
                        </h3>
                      </div>
                      <GripVertical
                        size={22}
                        className="text-theme-border-default group-hover:text-theme-primary cursor-move transition-colors"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="flex items-start gap-5 p-5 rounded-input bg-theme-bg-secondary border-2 border-transparent group/item hover:bg-theme-bg-card hover:border-theme-border-default transition-all">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-theme-primary" />
                        <div>
                          <p className="text-[16px] font-bold text-theme-text-primary leading-tight">
                            {t('home.sampleEvent', { defaultValue: 'Planning Meeting' })}
                          </p>
                          <p className="text-[12px] font-bold text-theme-text-secondary mt-2">
                            10:00 - 11:30
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-10 text-[12px] font-black uppercase tracking-brand-lg text-theme-text-secondary hover:text-theme-primary transition-colors flex items-center gap-3 group/btn min-h-[44px]"
                    >
                      {t('home.viewAll', { defaultValue: 'View All' })}{' '}
                      <ChevronRight
                        size={18}
                        className="group-hover/btn:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </button>
                  </article>

                  {/* Empty Widget Slots */}
                  {[2, 3].map((slot) => (
                    <div
                      key={slot}
                      className="widget-slot h-[300px] md:h-full min-h-[300px] rounded-editorial-lg border-2 border-dashed border-theme-border-default bg-theme-bg-card/40 flex flex-col items-center justify-center group hover:border-theme-primary transition-all cursor-pointer relative overflow-hidden focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
                      tabIndex={0}
                      role="button"
                      aria-label={t('aria.addWidgetToSlot', {
                        defaultValue: `Add widget to slot ${slot}`,
                      })}
                    >
                      <Plus
                        size={32}
                        className="text-theme-border-default group-hover:text-theme-primary group-hover:scale-110 transition-all"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="mt-5 text-[11px] font-black uppercase text-theme-text-secondary tracking-brand font-mono-brand">
                        {t('home.emptySlot', { defaultValue: 'Empty' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Pinned Top Widget Section */}
            {pinnedWidget && (
              <section className="mb-12 sm:mb-16">
                <TopWidget
                  icon={
                    pinnedWidget.id === 'schedule' ? (
                      <Calendar className="w-6 h-6" />
                    ) : (
                      <Wallet className="w-6 h-6" />
                    )
                  }
                  title={t(pinnedWidget.nameKey)}
                  badgeText={t('badge.activeFocus')}
                  onChangeFocus={() => setPinnedWidgetId(null)}
                  changeFocusText={t('widget.changeFocus')}
                >
                  {/* Mockup Widget Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pinnedWidget.id === 'schedule' ? (
                      <>
                        {/* Schedule Widget Mockup */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-theme-bg-page rounded-input border border-theme-border-default">
                            <span className="font-bold text-sm text-theme-text-primary">
                              14:00 {t('placeholder.schedule').split('.')[0]}
                            </span>
                            <span className="text-[10px] font-bold text-theme-primary">
                              {t('widget.scheduleNow')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-theme-bg-page/50 rounded-input border border-theme-border-subtle">
                            <span className="font-bold text-sm text-theme-text-muted">
                              16:30 {t('placeholder.schedule').split('.')[0]}
                            </span>
                            <span className="text-[10px] font-bold text-theme-text-muted">
                              {t('widget.scheduleNext')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center p-6 bg-theme-primary/5 rounded-input border border-theme-primary/20">
                          <p className="text-sm font-bold text-theme-text-primary mb-2">
                            {t('widget.scheduleSummary', {
                              name: user?.name || user?.username,
                              count: 3,
                            })}
                          </p>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-xs font-bold uppercase text-theme-primary min-h-[44px] hover:opacity-80 transition-opacity"
                            aria-label={t('widget.quickAdd')}
                          >
                            {t('widget.quickAdd')} <Plus className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Finance Widget Mockup */
                      <div className="col-span-2 text-center py-8 text-theme-text-secondary">
                        {t('widget.financeLoaded')}
                      </div>
                    )}
                  </div>
                </TopWidget>
              </section>
            )}

            {/* Index Section - V0.0.1 Style */}
            <section className="mb-24" aria-label={t('aria.mainMenu')}>
              {/* Section Header with View Toggle - V0.0.1 Style */}
              <div className="flex items-center justify-between mb-14 border-b-4 border-theme-text-primary pb-10 px-6">
                <h2 className="text-4xl text-theme-text-primary tracking-tight font-serif-title">
                  {t('home.index', { defaultValue: 'Index' })}
                </h2>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
                  {MENU_ITEMS.map((menu, index) => {
                    const IconComponent = menu.icon;
                    const isDisabled = menu.status === 'coming-soon';
                    const canPin = canPinAsWidget(menu.id);

                    return (
                      <MenuCard
                        key={menu.id}
                        index={index + 1}
                        icon={<IconComponent />}
                        title={t(menu.nameKey)}
                        description={isDisabled ? t('home.comingSoon') : t(menu.descriptionKey)}
                        onClick={isDisabled ? undefined : handleMenuClick(menu)}
                        isPinned={pinnedWidgetId === menu.id}
                        onPin={canPin ? handlePinWidget(menu.id) : undefined}
                        pinTooltip={
                          pinnedWidgetId === menu.id
                            ? t('widget.unpinFromTop')
                            : t('widget.pinToTop')
                        }
                        className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        aria-label={
                          isDisabled
                            ? `${t(menu.nameKey)} - ${t('home.comingSoon')}`
                            : t(menu.nameKey)
                        }
                      />
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {MENU_ITEMS.map((menu, index) => {
                    const IconComponent = menu.icon;
                    const isDisabled = menu.status === 'coming-soon';
                    const canPin = canPinAsWidget(menu.id);

                    return (
                      <MenuRow
                        key={menu.id}
                        index={index + 1}
                        icon={<IconComponent />}
                        title={
                          isDisabled
                            ? `${t(menu.nameKey)} (${t('home.comingSoon')})`
                            : t(menu.nameKey)
                        }
                        description={isDisabled ? undefined : t(menu.descriptionKey)}
                        onClick={isDisabled ? undefined : handleMenuClick(menu)}
                        isPinned={pinnedWidgetId === menu.id}
                        onPin={canPin ? handlePinWidget(menu.id) : undefined}
                        className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        aria-label={
                          isDisabled
                            ? `${t(menu.nameKey)} - ${t('home.comingSoon')}`
                            : t(menu.nameKey)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Archive Support Banner - V0.0.1 Style */}
            <section className="mt-12 sm:mt-16">
              <div className="bg-theme-bg-card border-2 border-theme-border-default rounded-editorial p-8 sm:p-10 text-center font-medium">
                <SectionBadge className="mb-4">{t('badge.archiveSupport')}</SectionBadge>
                <p className="text-theme-text-secondary text-sm sm:text-base max-w-lg mx-auto">
                  {t('home.supportMessage', {
                    defaultValue: 'Your archive grows with every story you record.',
                  })}
                </p>
              </div>
            </section>
          </div>
        ) : (
          /* Landing Page - V0.0.1 Hero Style */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-56">
            <div className="text-center">
              {/* Giant Brand Title - V0.0.1 Style */}
              <h1 className="text-7xl sm:text-8xl md:text-[10rem] text-theme-text-primary mb-20 tracking-editorial italic font-serif-title">
                girok<span className="text-theme-primary">.</span>
              </h1>

              {/* Enter Button - V0.0.1 Style */}
              <Link to="/login">
                <Button
                  variant="primary"
                  size="xl"
                  rounded="full"
                  className="px-16 sm:px-20 py-6 sm:py-8 text-[14px] font-black uppercase tracking-brand shadow-theme-xl hover:scale-105 transition-transform"
                >
                  {t('auth.enter', { defaultValue: 'Enter' })}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Widget slot background pattern */}
      <style>{`
        .widget-slot {
          background-image: radial-gradient(var(--theme-border-subtle) 1.5px, transparent 1.5px);
          background-size: 20px 20px;
        }
      `}</style>
    </>
  );
}
