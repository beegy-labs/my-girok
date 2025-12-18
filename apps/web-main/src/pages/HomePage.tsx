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
} from 'lucide-react';

interface MenuItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
}

// 9 Menu Functions - Editorial Archive Style (matches mockup V24.5)
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

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [pinnedWidgetId, setPinnedWidgetId] = useState<string | null>(null);

  // Memoized pinned widget data
  const pinnedWidget = useMemo(
    () => MENU_ITEMS.find((item) => item.id === pinnedWidgetId),
    [pinnedWidgetId],
  );

  // Memoized handler per rules.md: "✅ Memoize handlers with useCallback"
  const handleMenuClick = useCallback(
    (menu: MenuItem) => {
      if (menu.status === 'active') {
        navigate(menu.route);
      }
    },
    [navigate],
  );

  // Pin/unpin widget handler
  const handlePinWidget = useCallback((menuId: string) => {
    setPinnedWidgetId((prev) => (prev === menuId ? null : menuId));
  }, []);

  // Check if a menu can be pinned as widget
  const canPinAsWidget = useCallback(
    (menuId: string) => WIDGET_ENABLED_IDS.includes(menuId as (typeof WIDGET_ENABLED_IDS)[number]),
    [],
  );

  return (
    <>
      <SEO
        title={isAuthenticated ? `${user?.name || user?.username}'s Archive` : undefined}
        description="Create, manage, and share your professional resume with girok. Build your career profile, track your achievements, and share your professional story with the world."
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
        Skip to main content
      </a>

      <main
        id="main-content"
        className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-200"
        style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
        role="main"
      >
        {isAuthenticated ? (
          /* Authenticated Dashboard */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Welcome Section - Editorial Style */}
            <header className="mb-12 sm:mb-16">
              <SectionBadge className="mb-4">{t('badge.myArchive')}</SectionBadge>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl text-theme-text-primary tracking-tight mb-3"
                style={{ fontFamily: 'var(--font-family-serif-title)' }}
              >
                {user?.name || user?.username}
              </h1>
              <p className="text-base sm:text-lg text-theme-text-secondary">
                {t('home.startToday')}
              </p>
            </header>

            {/* Top Widget Section (when pinned) */}
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
                          <div className="flex items-center justify-between p-4 bg-theme-bg-page rounded-2xl border border-theme-border-default">
                            <span className="font-bold text-sm text-theme-text-primary">
                              14:00 {t('placeholder.schedule').split('.')[0]}
                            </span>
                            <span className="text-[10px] font-bold text-theme-primary">
                              {t('widget.scheduleNow')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-theme-bg-page/50 rounded-2xl border border-theme-border-subtle">
                            <span className="font-bold text-sm text-theme-text-muted">
                              16:30 {t('placeholder.schedule').split('.')[0]}
                            </span>
                            <span className="text-[10px] font-bold text-theme-text-muted">
                              {t('widget.scheduleNext')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center p-6 bg-theme-primary/5 rounded-3xl border border-theme-primary/20">
                          <p className="text-sm font-bold text-theme-text-primary mb-2">
                            {t('widget.scheduleSummary', {
                              name: user?.name || user?.username,
                              count: 3,
                            })}
                          </p>
                          <button className="flex items-center gap-2 text-xs font-bold uppercase text-theme-primary">
                            {t('widget.quickAdd')} <Plus className="w-4 h-4" strokeWidth={3} />
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

            {/* Menu Section */}
            <section aria-label={t('aria.mainMenu')}>
              {/* Section Header with View Toggle */}
              <div className="flex items-center justify-between mb-8">
                <h2
                  className="text-xl sm:text-2xl text-theme-text-primary tracking-tight"
                  style={{ fontFamily: 'var(--font-family-serif-title)' }}
                >
                  {t('home.archiveFunctions')}
                </h2>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {MENU_ITEMS.map((menu, index) => {
                    const IconComponent = menu.icon;
                    const isDisabled = menu.status === 'coming-soon';
                    const canPin = canPinAsWidget(menu.id);

                    return (
                      <MenuCard
                        key={menu.id}
                        index={index + 1}
                        icon={<IconComponent className="w-6 h-6" />}
                        title={t(menu.nameKey)}
                        description={isDisabled ? t('home.comingSoon') : t(menu.descriptionKey)}
                        onClick={isDisabled ? undefined : () => handleMenuClick(menu)}
                        isPinned={pinnedWidgetId === menu.id}
                        onPin={canPin ? () => handlePinWidget(menu.id) : undefined}
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
                <div className="space-y-3">
                  {MENU_ITEMS.map((menu, index) => {
                    const IconComponent = menu.icon;
                    const isDisabled = menu.status === 'coming-soon';

                    return (
                      <MenuRow
                        key={menu.id}
                        index={index + 1}
                        icon={<IconComponent className="w-5 h-5" />}
                        title={
                          isDisabled
                            ? `${t(menu.nameKey)} (${t('home.comingSoon')})`
                            : t(menu.nameKey)
                        }
                        onClick={isDisabled ? undefined : () => handleMenuClick(menu)}
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

            {/* Archive Support Banner */}
            <section className="mt-12 sm:mt-16">
              <div className="bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10 text-center">
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
          /* Landing Page for Non-authenticated Users - Editorial centered style (consistent with LoginPage) */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md text-center">
              {/* Brand Badge */}
              <span
                className="inline-block text-xs tracking-[0.3em] text-theme-text-muted mb-4 uppercase"
                style={{ fontFamily: 'var(--font-family-mono-brand)' }}
              >
                {t('badge.personalArchive')}
              </span>

              {/* Brand Title */}
              <h1
                className="text-3xl sm:text-4xl text-theme-text-primary mb-3 tracking-tight"
                style={{ fontFamily: 'var(--font-family-serif-title)' }}
              >
                Girok
              </h1>

              {/* Tagline */}
              <p className="text-theme-text-secondary text-sm sm:text-base mb-8 leading-relaxed">
                {t('home.title')}
              </p>

              {/* CTA Card - Editorial Style (consistent with LoginPage card) */}
              <div className="bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10 shadow-theme-lg">
                <div className="space-y-4">
                  <Link to="/register" className="block">
                    <Button variant="primary" size="lg" fullWidth>
                      {t('home.createRecordBook')}
                    </Button>
                  </Link>
                  <Link to="/login" className="block">
                    <Button variant="secondary" size="lg" fullWidth>
                      {t('nav.login')}
                    </Button>
                  </Link>
                </div>

                {/* Divider */}
                <div className="mt-8 pt-6 border-t border-theme-border-subtle">
                  <p className="text-sm text-theme-text-muted">{t('home.startToday')}</p>
                </div>
              </div>

              {/* Footer Note */}
              <p className="text-center text-xs text-theme-text-tertiary mt-6">
                {t('auth.termsAgreement')}
              </p>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </>
  );
}
