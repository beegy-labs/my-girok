import { SetMetadata } from '@nestjs/common';

export const REQUIRE_COUNTRY_CONSENT_KEY = 'requireCountryConsent';

/**
 * Decorator to require user to have consent for a specific country
 * @param countryCode - Country code or 'dynamic' to get from header/params
 * Issue: #358
 */
export const RequireCountryConsent = (countryCode?: string) =>
  SetMetadata(REQUIRE_COUNTRY_CONSENT_KEY, countryCode || 'dynamic');
