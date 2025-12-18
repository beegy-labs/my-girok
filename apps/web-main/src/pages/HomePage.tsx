import { useState } from 'react';
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
  type ViewMode,
} from '@my-girok/ui-components';
import Footer from '../components/Footer';
import { Book, FileText, Wallet, Settings, Library, Users, BarChart3, Bell } from 'lucide-react';

interface MenuItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
}

// 8 Menu Functions - Editorial Archive Style
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

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleMenuClick = (menu: MenuItem) => {
    if (menu.status === 'active') {
      navigate(menu.route);
    }
  };

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
        className="min-h-screen bg-theme-bg-page transition-colors duration-200"
        style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
        role="main"
      >
        {isAuthenticated ? (
          /* Authenticated Dashboard */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Welcome Section - Editorial Style */}
            <header className="mb-12 sm:mb-16">
              <SectionBadge className="mb-4">MY ARCHIVE</SectionBadge>
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

            {/* Menu Section */}
            <section aria-label="Main menu">
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

                    return (
                      <MenuCard
                        key={menu.id}
                        index={index + 1}
                        icon={<IconComponent className="w-6 h-6" />}
                        title={t(menu.nameKey)}
                        description={isDisabled ? t('home.comingSoon') : t(menu.descriptionKey)}
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
                <SectionBadge className="mb-4">ARCHIVE SUPPORT</SectionBadge>
                <p className="text-theme-text-secondary text-sm sm:text-base max-w-lg mx-auto">
                  {t('home.supportMessage', {
                    defaultValue: 'Your archive grows with every story you record.',
                  })}
                </p>
              </div>
            </section>
          </div>
        ) : (
          /* Landing Page for Non-authenticated Users */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hero Section - Editorial Style */}
            <header className="py-16 sm:py-24 lg:py-32 text-center">
              <span
                className="inline-block text-sm tracking-[0.3em] text-theme-text-muted mb-6 uppercase"
                style={{ fontFamily: 'var(--font-family-mono-brand)' }}
              >
                PERSONAL ARCHIVE
              </span>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl text-theme-text-primary mb-6 tracking-tight"
                style={{ fontFamily: 'var(--font-family-serif-title)' }}
              >
                Girok
              </h1>
              <p className="text-lg sm:text-xl text-theme-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
                {t('home.title')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto min-w-[180px]">
                    {t('home.createRecordBook')}
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto min-w-[180px]">
                    {t('nav.login')}
                  </Button>
                </Link>
              </div>
            </header>

            {/* Features Preview - 4 Main Functions */}
            <section className="py-12 sm:py-16" aria-labelledby="features-heading">
              <div className="text-center mb-12">
                <SectionBadge className="mb-4">FEATURES</SectionBadge>
                <h2
                  id="features-heading"
                  className="text-2xl sm:text-3xl text-theme-text-primary tracking-tight"
                  style={{ fontFamily: 'var(--font-family-serif-title)' }}
                >
                  {t('home.recordingTypes')}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {MENU_ITEMS.slice(0, 4).map((menu, index) => {
                  const IconComponent = menu.icon;
                  const isDisabled = menu.status === 'coming-soon';

                  return (
                    <div
                      key={menu.id}
                      className={`bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10 ${
                        isDisabled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <span
                          className="text-sm tracking-widest text-theme-text-muted"
                          style={{ fontFamily: 'var(--font-family-mono-brand)' }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <IconComponent className="w-6 h-6 text-theme-text-secondary" />
                      </div>
                      <h3
                        className="text-xl sm:text-2xl text-theme-text-primary mb-3 tracking-tight"
                        style={{ fontFamily: 'var(--font-family-serif-title)' }}
                      >
                        {t(menu.nameKey)}
                      </h3>
                      <p className="text-sm text-theme-text-secondary leading-relaxed">
                        {isDisabled ? t('home.comingSoon') : t(menu.descriptionKey)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <Footer />
      </main>
    </>
  );
}
