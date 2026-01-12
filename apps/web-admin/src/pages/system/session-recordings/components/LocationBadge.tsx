import { memo } from 'react';
import { MapPin } from 'lucide-react';

interface LocationBadgeProps {
  countryCode: string;
  showText?: boolean;
  className?: string;
}

/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji
 * e.g., 'KR' -> '🇰🇷', 'US' -> '🇺🇸'
 */
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '';
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const LocationBadge = memo<LocationBadgeProps>(
  ({ countryCode, showText = true, className = '' }) => {
    const flag = getFlagEmoji(countryCode);

    if (!countryCode) {
      return (
        <span className={`inline-flex items-center gap-1.5 text-theme-text-tertiary ${className}`}>
          <MapPin className="w-4 h-4" />
          {showText && <span>-</span>}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-theme-text-secondary ${className}`}
        title={countryCode}
      >
        <span className="text-base" role="img" aria-label={countryCode}>
          {flag}
        </span>
        {showText && <span>{countryCode}</span>}
      </span>
    );
  },
);

LocationBadge.displayName = 'LocationBadge';
