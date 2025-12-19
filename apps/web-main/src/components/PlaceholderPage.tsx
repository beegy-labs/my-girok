import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SectionBadge, Button } from '@my-girok/ui-components';
import { ArrowLeft } from 'lucide-react';
import Footer from './Footer';

interface PlaceholderPageProps {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  badge?: string;
}

export default function PlaceholderPage({
  icon,
  titleKey,
  descriptionKey,
  badge,
}: PlaceholderPageProps) {
  const { t } = useTranslation();
  const badgeText = badge ?? t('badge.comingSoon');

  return (
    <>
      <main className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-200 pt-nav">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-theme-bg-card border border-theme-border-default">
              <span className="text-theme-text-secondary">{icon}</span>
            </div>

            {/* Badge */}
            <SectionBadge className="mb-4">{badgeText}</SectionBadge>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-theme-text-primary mb-4 tracking-tight font-serif-title">
              {t(titleKey)}
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-theme-text-secondary mb-10 max-w-lg mx-auto">
              {t(descriptionKey, { defaultValue: 'This feature is under development.' })}
            </p>

            {/* Back Button */}
            <Link to="/">
              <Button variant="secondary" size="md">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.backToHome', { defaultValue: 'Back to Home' })}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
