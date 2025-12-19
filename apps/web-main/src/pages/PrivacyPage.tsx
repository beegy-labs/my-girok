import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SectionBadge, Button } from '@my-girok/ui-components';
import { ArrowLeft, Shield } from 'lucide-react';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-200 pt-nav">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-theme-bg-card border border-theme-border-default">
            <Shield className="w-8 h-8 text-theme-text-secondary" />
          </div>

          <SectionBadge className="mb-4">
            {t('badge.legal', { defaultValue: 'LEGAL' })}
          </SectionBadge>

          <h1 className="text-3xl sm:text-4xl text-theme-text-primary mb-4 tracking-tighter italic font-serif-title">
            {t('footer.privacy')}
          </h1>
        </div>

        {/* Content Placeholder */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-editorial p-8 sm:p-10 mb-10">
          <p className="text-theme-text-secondary text-center">
            {t('legal.privacyPlaceholder', {
              defaultValue: 'Privacy Policy content will be available soon.',
            })}
          </p>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Link to="/">
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToHome', { defaultValue: 'Back to Home' })}
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
