import { ReactNode, memo, useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SectionBadge, Button } from '@my-girok/ui-components';
import { ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';

/**
 * Props for LegalPageLayout component
 */
export interface LegalPageLayoutProps {
  /**
   * Icon component to display in the header
   */
  icon: ReactNode;

  /**
   * Page title (translated string)
   */
  title: string;

  /**
   * Badge text (optional, defaults to 'LEGAL')
   */
  badge?: string;

  /**
   * Main content of the page
   */
  children: ReactNode;
}

/**
 * LegalPageLayout - V0.0.1 AAA Workstation Design
 *
 * Unified layout for legal/policy pages (Privacy, Terms).
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio.
 *
 * Consolidates duplicate patterns from:
 * - PrivacyPage.tsx
 * - TermsPage.tsx
 *
 * @example
 * ```tsx
 * <LegalPageLayout
 *   icon={<Shield className="w-8 h-8 text-theme-text-secondary" />}
 *   title={t('footer.privacy')}
 * >
 *   <p>Privacy policy content...</p>
 * </LegalPageLayout>
 * ```
 */
function LegalPageLayoutComponent({ icon, title, badge, children }: LegalPageLayoutProps) {
  const { t } = useTranslation();

  // Memoized badge text to prevent recalculation (rules.md:277-278)
  const badgeText = useMemo(() => badge ?? t('badge.legal', { defaultValue: 'LEGAL' }), [badge, t]);

  return (
    <>
      <main className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-200 pt-nav">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-theme-bg-card border border-theme-border-default">
              {icon}
            </div>

            <SectionBadge className="mb-4">{badgeText}</SectionBadge>

            <h1 className="text-3xl sm:text-4xl text-theme-text-primary mb-4 tracking-editorial italic font-serif-title">
              {title}
            </h1>
          </div>

          {/* Content */}
          <div className="bg-theme-bg-card border border-theme-border-default rounded-soft p-8 sm:p-10 mb-10">
            {children}
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
      </main>

      <Footer />
    </>
  );
}

/**
 * Memoized LegalPageLayout component (rules.md:275)
 * Prevents unnecessary re-renders when parent components update
 */
const LegalPageLayout = memo(LegalPageLayoutComponent);
export default LegalPageLayout;
