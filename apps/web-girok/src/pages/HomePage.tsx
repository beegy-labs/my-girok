import { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { generateWebsiteSchema } from '../utils/structuredData';
import { SectionBadge, TopWidget, type ViewMode } from '@my-girok/ui-components';
import Footer from '../components/Footer';
import { Calendar, Wallet, Plus } from 'lucide-react';

import {
  AdBanner,
  HeroSection,
  MenuIndexSection,
  PromoCarousel,
  WorkstationSection,
  MENU_ITEMS,
} from '../components/home';

/**
 * HomePage - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [pinnedWidgetId, setPinnedWidgetId] = useState<string | null>(null);

  // TODO: Replace with actual ad availability check
  const isAdEnabled = true;

  // Memoized pinned widget data
  const pinnedWidget = useMemo(
    () => MENU_ITEMS.find((item) => item.id === pinnedWidgetId),
    [pinnedWidgetId],
  );

  // Pin/unpin widget handler
  const handlePinWidget = useCallback((menuId: string) => {
    setPinnedWidgetId((prev) => (prev === menuId ? null : menuId));
  }, []);

  return (
    <>
      <SEO
        title={isAuthenticated ? `${user?.username}'s Archive` : undefined}
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
        className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-700"
        role="main"
      >
        {isAuthenticated ? (
          /* Authenticated Dashboard - V0.0.1 Style */
          <div className="w-full lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
            {/* Banner Section - Promo or AdSense */}
            <section
              className="mb-8 sm:mb-12 lg:mb-16"
              aria-label={
                isAdEnabled
                  ? t('aria.advertisement', { defaultValue: 'Advertisement' })
                  : t('aria.featuredPromotions', { defaultValue: 'Featured Promotions' })
              }
            >
              {isAdEnabled ? <AdBanner /> : <PromoCarousel />}
            </section>

            {/* Workstation Section */}
            <WorkstationSection />

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
                              name: user?.username,
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

            {/* Index Section */}
            <MenuIndexSection
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              pinnedWidgetId={pinnedWidgetId}
              onPinWidget={handlePinWidget}
            />

            {/* Archive Support Banner */}
            <section className="mt-12 sm:mt-16">
              <div className="bg-theme-bg-card border-2 border-theme-border-default rounded-soft p-8 sm:p-10 text-center font-medium">
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
          <HeroSection />
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
