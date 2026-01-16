import { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PROMOS } from './constants';

/**
 * PromoCarousel - Self promo carousel for authenticated users
 * Displays promotional content when ads are not enabled
 */
function PromoCarouselComponent() {
  const { t } = useTranslation();
  const [currentPromo, setCurrentPromo] = useState(0);

  const handlePrevPromo = useCallback(() => {
    setCurrentPromo((prev) => (prev - 1 + PROMOS.length) % PROMOS.length);
  }, []);

  const handleNextPromo = useCallback(() => {
    setCurrentPromo((prev) => (prev + 1) % PROMOS.length);
  }, []);

  return (
    <div className="relative group w-full min-h-[200px] sm:min-h-[240px] lg:min-h-[300px] rounded-soft border-2 border-theme-border-default bg-theme-bg-card shadow-theme-md overflow-hidden transition-all hover:border-theme-primary focus-within:ring-[4px] focus-within:ring-theme-focus-ring">
      {/* Content wrapper */}
      <div className="h-full p-4 sm:p-8 lg:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 lg:gap-10">
        {/* Text content */}
        <div className="flex-1 flex flex-col justify-center" key={currentPromo}>
          <span className="text-[10px] sm:text-[11px] lg:text-[12px] font-black uppercase tracking-brand text-theme-primary mb-2 sm:mb-3 lg:mb-4 block font-mono-brand">
            {t(PROMOS[currentPromo].tagKey, { defaultValue: 'Premium' })}
          </span>
          <h2 className="text-xl sm:text-3xl lg:text-5xl text-theme-text-primary mb-2 sm:mb-4 lg:mb-6 leading-tight font-serif-title">
            {t(PROMOS[currentPromo].titleKey, { defaultValue: 'Gold Edition.' })}
          </h2>
          <p className="hidden sm:block text-sm lg:text-lg font-bold text-theme-text-secondary mb-4 sm:mb-6 lg:mb-10 leading-relaxed max-w-xl">
            {t(PROMOS[currentPromo].descKey, {
              defaultValue: 'Unlimited storage and enhanced security.',
            })}
          </p>
          <button
            type="button"
            className="text-[10px] sm:text-[11px] lg:text-[12px] font-black uppercase tracking-brand-sm text-theme-primary border-b-2 border-theme-primary pb-1 sm:pb-2 hover:opacity-80 transition-all w-fit min-h-[36px] sm:min-h-[44px]"
            aria-label={t('aria.viewPromoDetails', {
              defaultValue: 'View promo details',
            })}
          >
            {t(PROMOS[currentPromo].ctaKey, { defaultValue: 'Learn More' })}
          </button>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 sm:gap-3 lg:gap-4 self-end sm:self-center">
          <button
            onClick={handlePrevPromo}
            className="p-2 sm:p-3 lg:p-5 border-2 border-theme-border-default rounded-full hover:bg-theme-bg-secondary focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring transition-all shadow-theme-sm min-w-[40px] sm:min-w-[48px] lg:min-w-[56px] min-h-[40px] sm:min-h-[48px] lg:min-h-[56px] flex items-center justify-center"
            aria-label={t('aria.previousPromo', { defaultValue: 'Previous Promo' })}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" aria-hidden="true" />
          </button>
          <button
            onClick={handleNextPromo}
            className="p-2 sm:p-3 lg:p-5 border-2 border-theme-border-default rounded-full hover:bg-theme-bg-secondary focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring transition-all shadow-theme-sm min-w-[40px] sm:min-w-[48px] lg:min-w-[56px] min-h-[40px] sm:min-h-[48px] lg:min-h-[56px] flex items-center justify-center"
            aria-label={t('aria.nextPromo', { defaultValue: 'Next Promo' })}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Slide indicators - mobile only */}
      <div className="flex sm:hidden justify-center gap-2 pb-4">
        {PROMOS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPromo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentPromo === index ? 'bg-theme-primary w-4' : 'bg-theme-border-default'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export const PromoCarousel = memo(PromoCarouselComponent);
