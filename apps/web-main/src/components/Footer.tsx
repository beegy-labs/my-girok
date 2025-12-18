import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

/**
 * Footer - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with proper touch targets
 */
export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-40 py-16 sm:py-24 border-t-2 border-theme-border-default bg-theme-bg-secondary/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 sm:gap-14">
          {/* Brand & Version */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <p className="text-lg text-theme-text-primary font-black uppercase tracking-[0.5em] sm:tracking-[0.6em] font-mono-brand">
              girok.dev
              <span className="text-theme-primary ml-2">&copy; {currentYear}</span>
            </p>
            <p className="text-[12px] font-bold text-theme-text-secondary uppercase tracking-widest font-mono-brand">
              System V0.0.1 AAA Enhanced
            </p>
          </div>

          {/* Links - V0.0.1 Style */}
          <nav
            className="flex gap-8 sm:gap-12 text-[13px] font-black uppercase tracking-[0.25em] text-theme-text-secondary"
            aria-label={t('aria.footerNavigation')}
          >
            <Link
              to="/privacy"
              className="hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring rounded p-3 min-h-[44px] flex items-center"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              to="/terms"
              className="hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring rounded p-3 min-h-[44px] flex items-center"
            >
              {t('footer.terms')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
