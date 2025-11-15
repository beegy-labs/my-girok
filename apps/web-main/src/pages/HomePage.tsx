import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

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
    <div className="max-w-7xl mx-auto">
      {isAuthenticated ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-lg dark:shadow-dark-lg p-4 sm:p-6 lg:p-8 transition-colors duration-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-2xl sm:text-3xl">📚</span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900 dark:text-dark-text-primary break-words">
                {user?.name || user?.username}{t('home.recordBook')}
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary ml-8 sm:ml-10 lg:ml-12">
              {t('home.startToday')}
            </p>
          </div>

          {/* Apps Grid */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
              <span>📖</span>
              {t('home.recordType')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={app.status === 'active' ? app.route : '#'}
                  className={`block bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-4 sm:p-6 transition-all ${
                    app.status === 'coming-soon'
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:shadow-xl dark:hover:shadow-dark-lg hover:-translate-y-1 hover:border-amber-300 dark:hover:border-amber-500/30'
                  }`}
                  onClick={(e) => app.status === 'coming-soon' && e.preventDefault()}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`text-4xl sm:text-5xl p-2 sm:p-3`}>
                      {app.icon}
                    </div>
                    {app.status === 'coming-soon' && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 sm:px-3 py-1 rounded-full font-medium whitespace-nowrap">
                        {t('home.comingSoon')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-dark-text-primary mb-2">{t(app.nameKey)}</h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary text-xs sm:text-sm">{t(app.descriptionKey)}</p>
                  {app.status === 'active' && (
                    <div className="mt-3 sm:mt-4 text-amber-700 dark:text-amber-400 font-semibold text-xs sm:text-sm flex items-center gap-1">
                      {t('home.recordGoTo')}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-4 sm:p-6 transition-colors duration-200">
            <h2 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-dark-text-primary mb-3 sm:mb-4">{t('home.quickLinks')}</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link
                to={`/${user?.username}`}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline font-medium text-sm sm:text-base flex items-center gap-1"
              >
                <span>🔗</span>
                {t('home.viewPublicProfile')}
              </Link>
              <Link
                to="/settings"
                className="text-gray-600 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary hover:underline font-medium text-sm sm:text-base flex items-center gap-1"
              >
                <span>⚙️</span>
                {t('home.settings')}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-xl dark:shadow-dark-lg p-6 sm:p-8 lg:p-12 text-center transition-colors duration-200">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-5xl sm:text-6xl">📚</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-amber-900 dark:text-dark-text-primary mb-3 sm:mb-4">
              My-Girok
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-dark-text-secondary mb-6 sm:mb-8">
              {t('home.title')}<br />
              <span className="text-gray-600 dark:text-dark-text-tertiary text-sm sm:text-base">{t('home.allInOne')}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 transform hover:scale-105 transition-all"
              >
                {t('home.createRecordBook')}
              </Link>
              <Link
                to="/login"
                className="bg-gray-100 dark:bg-dark-bg-elevated hover:bg-gray-200 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold border border-gray-300 dark:border-dark-border-default transform hover:scale-105 transition-all"
              >
                {t('nav.login')}
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-dark-text-primary mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
              <span>📖</span>
              {t('home.recordingTypes')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {apps.map((app) => (
                <div key={app.id} className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-4 sm:p-6 transition-colors duration-200">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{app.icon}</div>
                  <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-dark-text-primary mb-2">{t(app.nameKey)}</h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary text-xs sm:text-sm">{t(app.descriptionKey)}</p>
                  {app.status === 'coming-soon' && (
                    <span className="inline-block mt-2 sm:mt-3 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 sm:px-3 py-1 rounded-full font-medium">
                      {t('home.comingSoon')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
