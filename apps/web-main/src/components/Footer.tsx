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
    <footer className="w-full pt-24 pb-32 border-t-2 border-theme-border-default bg-theme-bg-secondary/40">
      <div className="max-w-5xl mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 sm:gap-14">
          {/* Brand & Version */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <p className="text-lg text-theme-text-primary font-black uppercase tracking-brand-lg font-mono-brand">
              girok.dev
              <span className="text-theme-primary ml-2">&copy; {currentYear}</span>
            </p>
            <p className="text-[12px] font-bold text-theme-text-secondary uppercase tracking-brand-lg font-mono-brand">
              {t('footer.version', { defaultValue: 'System V0.0.1 AAA Enhanced' })}
            </p>
          </div>

          {/* Links - V0.0.1 Style (spec: 11px, 0.25em, gap-48px) */}
          <nav
            className="flex gap-8 sm:gap-12 text-[11px] font-black uppercase tracking-brand-md text-theme-text-secondary"
            aria-label={t('aria.footerNavigation')}
          >
            <Link
              to="/privacy"
              className="hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring rounded p-3 min-h-[44px] flex items-center"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              to="/terms"
              className="hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring rounded p-3 min-h-[44px] flex items-center"
            >
              {t('footer.terms')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
