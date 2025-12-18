import { useTranslation } from 'react-i18next';
import ThemeToggle from '../../components/settings/ThemeToggle';
import SectionOrderManager from '../../components/settings/SectionOrderManager';
import { SectionBadge } from '@my-girok/ui-components';
import Footer from '../../components/Footer';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <main
      className="min-h-screen bg-theme-bg-page transition-colors duration-200"
      style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header - Editorial Style */}
        <header className="mb-12 sm:mb-16">
          <SectionBadge className="mb-4">{t('badge.environment')}</SectionBadge>
          <h1
            className="text-3xl sm:text-4xl text-theme-text-primary tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-family-serif-title)' }}
          >
            {t('settings.title')}
          </h1>
          <p className="text-base text-theme-text-secondary">{t('settings.description')}</p>
        </header>

        {/* Settings Cards - Editorial Style */}
        <div className="space-y-6 sm:space-y-8">
          {/* Theme Settings */}
          <section className="bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10">
            <ThemeToggle />
          </section>

          {/* Section Order Settings */}
          <section className="bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10">
            <SectionOrderManager />
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
