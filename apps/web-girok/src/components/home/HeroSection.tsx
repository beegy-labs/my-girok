import { memo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@my-girok/ui-components';
import { useTheme } from '../../hooks/useTheme';

/**
 * HeroSection - Landing page hero for unauthenticated users
 * V0.0.1 Hero Style with giant brand title
 */
function HeroSectionComponent() {
  const { t } = useTranslation();
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-56 relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          aria-label={effectiveTheme === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')}
          className="p-3 rounded-full hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
        >
          {effectiveTheme === 'dark' ? (
            <Sun size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="text-center">
        {/* Giant Brand Title - V0.0.1 Style */}
        <h1 className="text-7xl sm:text-8xl md:text-[10rem] text-theme-text-primary mb-20 tracking-editorial italic font-serif-title">
          girok<span className="text-theme-primary">.</span>
        </h1>

        {/* Enter Button - V0.0.1 Style */}
        <Link to="/login">
          <Button
            variant="primary"
            size="xl"
            rounded="full"
            className="px-16 sm:px-20 shadow-theme-xl hover:scale-105"
          >
            {t('auth.enter', { defaultValue: 'Enter' })}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export const HeroSection = memo(HeroSectionComponent);
