import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto border-t border-theme-border-subtle bg-theme-bg-card">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Tagline - Editorial serif style */}
        <p
          className="text-center text-lg sm:text-xl text-theme-text-secondary mb-8 tracking-tight"
          style={{ fontFamily: 'var(--font-family-serif-title)' }}
        >
          {t('footer.tagline')}
        </p>

        {/* Links - centered */}
        <nav
          className="flex items-center justify-center gap-6 mb-8"
          aria-label={t('aria.footerNavigation')}
        >
          <Link
            to="/privacy"
            className="text-sm text-theme-text-muted hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring rounded"
          >
            {t('footer.privacy')}
          </Link>
          <span className="text-theme-text-muted" aria-hidden="true">
            ·
          </span>
          <Link
            to="/terms"
            className="text-sm text-theme-text-muted hover:text-theme-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring rounded"
          >
            {t('footer.terms')}
          </Link>
        </nav>

        {/* Brand & Copyright - centered minimal */}
        <div className="text-center">
          <span
            className="text-sm text-theme-text-muted tracking-wide"
            style={{ fontFamily: 'var(--font-family-mono-brand)' }}
          >
            Girok
          </span>
          <span className="text-theme-text-muted text-sm mx-2">·</span>
          <span className="text-theme-text-muted text-sm">&copy; {currentYear}</span>
        </div>
      </div>
    </footer>
  );
}
