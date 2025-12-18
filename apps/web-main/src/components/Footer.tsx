import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-theme-bg-card border-t border-theme-border-subtle">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-semibold text-theme-text-primary tracking-tight"
              style={{ fontFamily: 'var(--font-family-mono-brand)' }}
            >
              Girok
            </span>
            <span className="text-theme-text-muted text-sm">&copy; {currentYear}</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            <Link
              to="/privacy"
              className="text-sm text-theme-text-secondary hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring rounded"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              to="/terms"
              className="text-sm text-theme-text-secondary hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring rounded"
            >
              {t('footer.terms')}
            </Link>
          </nav>
        </div>

        {/* Tagline */}
        <p className="mt-6 text-center text-xs text-theme-text-muted tracking-wide">
          {t('footer.tagline')}
        </p>
      </div>
    </footer>
  );
}
