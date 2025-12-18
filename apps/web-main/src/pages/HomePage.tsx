import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { generateWebsiteSchema } from '../utils/structuredData';
import { Button } from '@my-girok/ui-components';
import { FileText, Wallet, Settings, Book, ArrowRight, ExternalLink } from 'lucide-react';

interface MenuCard {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
}

// Static menu configuration - defined outside component to avoid recreation on each render
const CORE_MENUS: MenuCard[] = [
  {
    id: 'records',
    nameKey: 'home.records.title',
    descriptionKey: 'home.records.description',
    icon: Book,
    route: '/records',
    status: 'coming-soon',
  },
  {
    id: 'resume',
    nameKey: 'home.resume.title',
    descriptionKey: 'home.resume.description',
    icon: FileText,
    route: '/resume/my',
    status: 'active',
  },
  {
    id: 'assets',
    nameKey: 'home.assets.title',
    descriptionKey: 'home.assets.description',
    icon: Wallet,
    route: '/assets',
    status: 'coming-soon',
  },
  {
    id: 'settings',
    nameKey: 'home.settings.title',
    descriptionKey: 'home.settings.description',
    icon: Settings,
    route: '/settings',
    status: 'coming-soon',
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();

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
        role="main"
      >
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          {isAuthenticated ? (
            <div className="space-y-8 sm:space-y-12">
              {/* Welcome Section - Clean and minimal */}
              <header className="text-center">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-theme-text-primary mb-2">
                  {user?.name || user?.username}
                  <span className="text-theme-text-secondary font-normal ml-2">
                    {t('home.welcomeSuffix', { defaultValue: '' })}
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-theme-text-secondary">
                  {t('home.startToday')}
                </p>
              </header>

              {/* 4 Core Menu Cards - Large grid with 36px radius */}
              <nav aria-label="Main menu">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {CORE_MENUS.map((menu) => {
                    const IconComponent = menu.icon;
                    const isDisabled = menu.status === 'coming-soon';

                    // Card content shared between Link and disabled div
                    const cardContent = (
                      <>
                        {/* Icon and Title */}
                        <div className="flex items-start justify-between">
                          <div
                            className={`
                              p-3 sm:p-4 rounded-2xl
                              ${
                                isDisabled
                                  ? 'bg-theme-bg-hover'
                                  : 'bg-theme-primary/10 group-hover:bg-theme-primary/20'
                              }
                              transition-colors
                            `}
                          >
                            <IconComponent
                              className={`w-6 h-6 sm:w-8 sm:h-8 ${isDisabled ? 'text-theme-text-muted' : 'text-theme-primary'}`}
                              aria-hidden="true"
                            />
                          </div>
                          {isDisabled && (
                            <span className="text-xs bg-theme-bg-hover text-theme-text-muted px-3 py-1.5 rounded-full font-medium">
                              {t('home.comingSoon')}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="mt-4 sm:mt-6">
                          <h2 className="text-lg sm:text-xl font-bold text-theme-text-primary mb-2">
                            {t(menu.nameKey)}
                          </h2>
                          <p className="text-sm sm:text-base text-theme-text-secondary leading-relaxed">
                            {t(menu.descriptionKey)}
                          </p>
                        </div>

                        {/* Action indicator */}
                        {!isDisabled && (
                          <div className="mt-4 flex items-center gap-2 text-theme-primary font-semibold text-sm sm:text-base opacity-0 group-hover:opacity-100 transition-opacity">
                            {t('home.recordGoTo')}
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                          </div>
                        )}
                      </>
                    );

                    const baseCardClasses =
                      'group relative bg-theme-bg-card border border-theme-border-subtle rounded-[36px] shadow-theme-md p-6 sm:p-8 transition-all duration-200 min-h-[180px] flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring focus-visible:ring-offset-2';

                    // Use semantic elements: Link for active, div with proper ARIA for disabled
                    return isDisabled ? (
                      <div
                        key={menu.id}
                        role="button"
                        aria-disabled="true"
                        aria-label={`${t(menu.nameKey)} - ${t('home.comingSoon')}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          // Prevent keyboard activation for disabled button (WCAG 2.1 3.2.1)
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                          }
                        }}
                        className={`${baseCardClasses} opacity-60 cursor-not-allowed`}
                      >
                        {cardContent}
                      </div>
                    ) : (
                      <Link
                        key={menu.id}
                        to={menu.route}
                        aria-label={t(menu.nameKey)}
                        className={`${baseCardClasses} hover:shadow-theme-lg hover:border-theme-primary hover:-translate-y-1 cursor-pointer`}
                      >
                        {cardContent}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Quick Link - Public Profile */}
              <div className="text-center">
                <Link
                  to={`/${user?.username}`}
                  className="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary-light font-medium text-base sm:text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring rounded-lg px-2 py-1"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  {t('home.viewPublicProfile')}
                </Link>
              </div>
            </div>
          ) : (
            /* Landing page for non-authenticated users */
            <div className="max-w-3xl mx-auto space-y-12 sm:space-y-16">
              {/* Hero Section - Clean and professional */}
              <header className="text-center py-8 sm:py-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-mono text-theme-text-primary mb-4 sm:mb-6 tracking-tight">
                  Girok
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl text-theme-text-secondary mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
                  {t('home.title')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register">
                    <Button variant="primary" size="lg" className="w-full sm:w-auto min-w-[160px]">
                      {t('home.createRecordBook')}
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto min-w-[160px]"
                    >
                      {t('nav.login')}
                    </Button>
                  </Link>
                </div>
              </header>

              {/* Features Section - 4 Core Menus Preview */}
              <section aria-labelledby="features-heading">
                <h2 id="features-heading" className="sr-only">
                  {t('home.recordingTypes')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {CORE_MENUS.map((menu) => {
                    const IconComponent = menu.icon;
                    const isDisabled = menu.status === 'coming-soon';

                    return (
                      <div
                        key={menu.id}
                        className={`
                          bg-theme-bg-card border border-theme-border-subtle
                          rounded-[36px] shadow-theme-sm p-6 sm:p-8
                          ${isDisabled ? 'opacity-60' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-2xl bg-theme-bg-secondary">
                            <IconComponent
                              className={`w-6 h-6 ${isDisabled ? 'text-theme-text-muted' : 'text-theme-primary'}`}
                              aria-hidden="true"
                            />
                          </div>
                          {isDisabled && (
                            <span className="text-xs bg-theme-bg-hover text-theme-text-muted px-3 py-1.5 rounded-full font-medium">
                              {t('home.comingSoon')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-theme-text-primary mb-2">
                          {t(menu.nameKey)}
                        </h3>
                        <p className="text-sm sm:text-base text-theme-text-secondary leading-relaxed">
                          {t(menu.descriptionKey)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
