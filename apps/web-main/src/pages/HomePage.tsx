import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { generateWebsiteSchema } from '../utils/structuredData';
import { PageHeader, SectionHeader, Card, PrimaryButton, SecondaryButton } from '../components/ui';

interface AppCard {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  route: string;
  color: string;
  status: 'active' | 'coming-soon';
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();

  const apps: AppCard[] = [
    {
      id: 'resume',
      nameKey: 'home.resume.title',
      descriptionKey: 'home.resume.description',
      icon: '📄',
      route: '/resume/my',
      color: 'bg-amber-700',
      status: 'active',
    },
    {
      id: 'blog',
      nameKey: 'home.blog.title',
      descriptionKey: 'home.blog.description',
      icon: '✍️',
      route: '/apps/blog',
      color: 'bg-amber-600',
      status: 'coming-soon',
    },
    {
      id: 'budget',
      nameKey: 'home.budget.title',
      descriptionKey: 'home.budget.description',
      icon: '💰',
      route: '/apps/budget',
      color: 'bg-amber-800',
      status: 'coming-soon',
    },
  ];

  return (
    <>
      <SEO
        title={isAuthenticated ? `${user?.name || user?.username}'s Record Book` : undefined}
        description="Create, manage, and share your professional resume with My-Girok. Build your career profile, track your achievements, and share your professional story with the world."
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
      <div className="min-h-screen bg-vintage-bg-page dark:bg-dark-bg-primary transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {isAuthenticated ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <PageHeader
            icon="📚"
            title={`${user?.name || user?.username}${t('home.recordBook')}`}
            subtitle={t('home.startToday')}
          />

          {/* Apps Grid */}
          <div>
            <SectionHeader icon="📖" title={t('home.recordType')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={app.status === 'active' ? app.route : '#'}
                  className={`block bg-vintage-bg-card dark:bg-dark-bg-card border border-vintage-border-subtle dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-4 sm:p-6 transition-all ${
                    app.status === 'coming-soon'
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:shadow-xl dark:hover:shadow-dark-lg hover:-translate-y-1 hover:border-vintage-primary dark:hover:border-vintage-primary/30'
                  }`}
                  onClick={(e) => app.status === 'coming-soon' && e.preventDefault()}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`text-4xl sm:text-5xl p-2 sm:p-3`}>
                      {app.icon}
                    </div>
                    {app.status === 'coming-soon' && (
                      <span className="text-xs bg-vintage-primary/20 dark:bg-vintage-primary/20 text-vintage-primary dark:text-vintage-primary-light px-2 sm:px-3 py-1 rounded-full font-medium whitespace-nowrap">
                        {t('home.comingSoon')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-text-primary dark:text-dark-text-primary mb-2">{t(app.nameKey)}</h3>
                  <p className="text-vintage-text-secondary dark:text-dark-text-secondary text-xs sm:text-sm">{t(app.descriptionKey)}</p>
                  {app.status === 'active' && (
                    <div className="mt-3 sm:mt-4 text-vintage-primary dark:text-vintage-primary font-semibold text-xs sm:text-sm flex items-center gap-1">
                      {t('home.recordGoTo')}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <Card variant="primary" padding="md">
            <h2 className="text-lg sm:text-xl font-bold text-vintage-text-primary dark:text-dark-text-primary mb-3 sm:mb-4">{t('home.quickLinks')}</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link
                to={`/${user?.username}`}
                className="text-vintage-primary dark:text-vintage-primary hover:text-vintage-primary-light dark:hover:text-vintage-primary-light hover:underline font-medium text-sm sm:text-base flex items-center gap-1"
              >
                <span>🔗</span>
                {t('home.viewPublicProfile')}
              </Link>
              <Link
                to="/settings"
                className="text-vintage-text-secondary dark:text-dark-text-secondary hover:text-vintage-text-primary dark:hover:text-dark-text-primary hover:underline font-medium text-sm sm:text-base flex items-center gap-1"
              >
                <span>⚙️</span>
                {t('home.settings')}
              </Link>
            </div>
          </Card>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <Card variant="primary" padding="lg" className="shadow-xl text-center">
            <div className="p-2 sm:p-4">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <span className="text-5xl sm:text-6xl">📚</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-vintage-text-primary dark:text-dark-text-primary mb-3 sm:mb-4">
                My-Girok
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-vintage-text-secondary dark:text-dark-text-secondary mb-6 sm:mb-8">
                {t('home.title')}<br />
                <span className="text-vintage-text-tertiary dark:text-dark-text-tertiary text-sm sm:text-base">{t('home.allInOne')}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link to="/register">
                  <PrimaryButton size="lg" className="w-full sm:w-auto">
                    {t('home.createRecordBook')}
                  </PrimaryButton>
                </Link>
                <Link to="/login">
                  <SecondaryButton size="lg" className="w-full sm:w-auto">
                    {t('nav.login')}
                  </SecondaryButton>
                </Link>
              </div>
            </div>
          </Card>

          {/* Features Section */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-vintage-text-primary dark:text-dark-text-primary mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
              <span>📖</span>
              {t('home.recordingTypes')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {apps.map((app) => (
                <Card key={app.id} variant="primary" padding="md">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{app.icon}</div>
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-text-primary dark:text-dark-text-primary mb-2">{t(app.nameKey)}</h3>
                  <p className="text-vintage-text-secondary dark:text-dark-text-secondary text-xs sm:text-sm">{t(app.descriptionKey)}</p>
                  {app.status === 'coming-soon' && (
                    <span className="inline-block mt-2 sm:mt-3 text-xs bg-vintage-primary/20 dark:bg-vintage-primary/20 text-vintage-primary dark:text-vintage-primary-light px-2 sm:px-3 py-1 rounded-full font-medium">
                      {t('home.comingSoon')}
                    </span>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
}
