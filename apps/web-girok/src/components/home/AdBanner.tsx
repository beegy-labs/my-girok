import { memo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AdBanner - Google AdSense banner placeholder
 * Displays responsive ad container with proper labeling
 */
function AdBannerComponent() {
  const { t } = useTranslation();

  return (
    <>
      {/* Ad Label - Required by AdSense policy */}
      <div className="flex justify-end mb-1">
        <span className="text-[10px] text-theme-text-muted uppercase tracking-wide">
          {t('ad.sponsored', { defaultValue: 'Sponsored' })}
        </span>
      </div>

      {/* Ad Container - Full width responsive (AdSense recommended) */}
      <div
        className="ad-container relative w-full overflow-hidden rounded-soft border-2 border-theme-border-default bg-theme-bg-card"
        data-ad-slot="homepage-banner"
        data-ad-format="auto"
        data-full-width-responsive="true"
      >
        {/* Responsive banner - min-height prevents CLS, allows larger ads */}
        <div className="w-full min-h-[100px] sm:min-h-[120px] lg:min-h-[160px] flex items-center justify-center">
          {/* Placeholder for development - will be replaced by AdSense */}
          <div className="ad-placeholder w-full min-h-[100px] sm:min-h-[120px] lg:min-h-[160px] border-2 border-dashed border-theme-border-subtle rounded-soft flex flex-col items-center justify-center bg-theme-bg-secondary/50 gap-2">
            <span className="text-sm font-mono text-theme-text-muted">
              {t('ad.placeholder', { defaultValue: 'Advertisement' })}
            </span>
            <span className="text-[10px] font-mono text-theme-text-muted/60">
              Full Width Responsive
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export const AdBanner = memo(AdBannerComponent);
