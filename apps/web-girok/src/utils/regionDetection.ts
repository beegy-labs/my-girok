/**
 * Region Detection Utility
 * Handles language and country detection with fallback chain:
 * Priority: 1. Cookie 2. DB (logged-in user) 3. Auto-detect (browser settings)
 *
 * Separates language (UI) and country (legal/regulatory context)
 */

import { getCookie, setCookie } from './cookies';
import {
  type SupportedLanguage,
  type SupportedCountry,
  TIMEZONE_TO_COUNTRY,
  BROWSER_LANG_TO_LANGUAGE,
  BROWSER_LANG_TO_COUNTRY,
  isValidLanguage,
  isValidCountry,
  getCountryName,
  getLanguageName,
  getEnabledLanguages,
  getEnabledCountries,
  getCountryConfig,
} from './localeConfig';

// Re-export types for convenience
export type { SupportedLanguage, SupportedCountry };
export { getCountryName, getLanguageName, getEnabledLanguages, getEnabledCountries };

// ============================================
// Cookie Keys
// ============================================

const LANGUAGE_COOKIE_KEY = 'user_language';
const COUNTRY_COOKIE_KEY = 'user_country';
const TIMEZONE_COOKIE_KEY = 'user_timezone';

// Legacy key for backwards compatibility
const LEGACY_REGION_COOKIE_KEY = 'user_region';
const LEGACY_LOCALE_COOKIE_KEY = 'user_locale';

// ============================================
// Cookie-based Storage
// ============================================

/**
 * Get language from cookie
 */
export function getLanguageFromCookie(): SupportedLanguage | null {
  const language = getCookie(LANGUAGE_COOKIE_KEY);
  if (isValidLanguage(language)) return language;

  // Fallback to legacy locale cookie
  const legacyLocale = getCookie(LEGACY_LOCALE_COOKIE_KEY);
  if (legacyLocale) {
    const baseLang = legacyLocale.split('-')[0];
    if (isValidLanguage(baseLang)) return baseLang;
  }

  return null;
}

/**
 * Save language to cookie
 */
export function saveLanguageToCookie(language: SupportedLanguage): void {
  setCookie(LANGUAGE_COOKIE_KEY, language, { expires: 365 });
}

/**
 * Get country from cookie
 */
export function getCountryFromCookie(): SupportedCountry | null {
  const country = getCookie(COUNTRY_COOKIE_KEY);
  if (isValidCountry(country)) return country;

  // Fallback to legacy region cookie
  const legacyRegion = getCookie(LEGACY_REGION_COOKIE_KEY);
  if (isValidCountry(legacyRegion)) return legacyRegion;

  return null;
}

/**
 * Save country to cookie
 */
export function saveCountryToCookie(country: SupportedCountry): void {
  setCookie(COUNTRY_COOKIE_KEY, country, { expires: 365 });
}

/**
 * Get timezone from cookie
 */
export function getTimezoneFromCookie(): string | null {
  return getCookie(TIMEZONE_COOKIE_KEY);
}

/**
 * Save timezone to cookie
 */
export function saveTimezoneToCookie(timezone: string): void {
  setCookie(TIMEZONE_COOKIE_KEY, timezone, { expires: 365 });
}

// ============================================
// Browser-based Auto-detection
// ============================================

/**
 * Get user's timezone from browser
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Get user's browser language
 */
export function getUserBrowserLanguage(): string {
  return navigator.language || navigator.languages?.[0] || 'en';
}

/**
 * Get all user's preferred languages
 */
export function getUserBrowserLanguages(): readonly string[] {
  return navigator.languages || [navigator.language || 'en'];
}

/**
 * Detect country from timezone
 */
export function getCountryFromTimezone(timezone: string): SupportedCountry | null {
  // Direct mapping
  if (timezone in TIMEZONE_TO_COUNTRY) {
    return TIMEZONE_TO_COUNTRY[timezone];
  }

  // Check US timezones (America/ prefix)
  if (timezone.startsWith('America/') || timezone.startsWith('US/')) {
    return 'US';
  }

  // Check UK timezones
  if (timezone.startsWith('Europe/London')) {
    return 'GB';
  }

  // Check India timezone
  if (timezone.startsWith('Asia/Kolkata') || timezone.startsWith('Asia/Calcutta')) {
    return 'IN';
  }

  return null;
}

/**
 * Detect language from browser language setting
 */
export function getLanguageFromBrowser(browserLang: string): SupportedLanguage | null {
  // Direct mapping
  if (browserLang in BROWSER_LANG_TO_LANGUAGE) {
    return BROWSER_LANG_TO_LANGUAGE[browserLang];
  }

  // Try base language (e.g., 'en-US' -> 'en')
  const baseLang = browserLang.split('-')[0];
  if (baseLang in BROWSER_LANG_TO_LANGUAGE) {
    return BROWSER_LANG_TO_LANGUAGE[baseLang];
  }

  return null;
}

/**
 * Detect country from browser language setting
 */
export function getCountryFromBrowserLanguage(browserLang: string): SupportedCountry | null {
  // Direct mapping
  if (browserLang in BROWSER_LANG_TO_COUNTRY) {
    return BROWSER_LANG_TO_COUNTRY[browserLang];
  }

  // Try base language
  const baseLang = browserLang.split('-')[0];
  if (baseLang in BROWSER_LANG_TO_COUNTRY) {
    return BROWSER_LANG_TO_COUNTRY[baseLang];
  }

  return null;
}

/**
 * Auto-detect user's language based on browser settings
 * Fallback: 'en' (English)
 */
export function autoDetectLanguage(): SupportedLanguage {
  // 1. Try primary browser language
  const primaryLang = getUserBrowserLanguage();
  const langFromPrimary = getLanguageFromBrowser(primaryLang);
  if (langFromPrimary) {
    return langFromPrimary;
  }

  // 2. Try other preferred languages
  const languages = getUserBrowserLanguages();
  for (const lang of languages) {
    const detected = getLanguageFromBrowser(lang);
    if (detected) {
      return detected;
    }
  }

  // 3. Fallback to English
  return 'en';
}

/**
 * Auto-detect user's country based on browser settings
 * Priority: 1. Timezone 2. Primary language 3. Other languages
 * Fallback: 'US'
 */
export function autoDetectCountry(): SupportedCountry {
  // 1. Try timezone first (most accurate for location)
  const timezone = getUserTimezone();
  const countryFromTimezone = getCountryFromTimezone(timezone);
  if (countryFromTimezone) {
    return countryFromTimezone;
  }

  // 2. Try primary browser language
  const primaryLang = getUserBrowserLanguage();
  const countryFromPrimary = getCountryFromBrowserLanguage(primaryLang);
  if (countryFromPrimary) {
    return countryFromPrimary;
  }

  // 3. Try other preferred languages
  const languages = getUserBrowserLanguages();
  for (const lang of languages) {
    const country = getCountryFromBrowserLanguage(lang);
    if (country) {
      return country;
    }
  }

  // 4. Fallback to US
  return 'US';
}

// ============================================
// Main Detection Interface
// ============================================

/**
 * User locale info combining language and country
 */
export interface UserLocaleInfo {
  language: SupportedLanguage;
  country: SupportedCountry;
  timezone: string;
  source: 'cookie' | 'db' | 'auto';
}

/**
 * User locale data from database
 */
export interface UserLocaleFromDB {
  language?: string | null;
  country?: string | null;
  timezone?: string | null;
  // Legacy fields for backwards compatibility
  region?: string | null;
  locale?: string | null;
}

/**
 * Get user's locale with priority: Cookie → DB → Auto-detect
 * @param userFromDB - Optional user data from DB (if logged in)
 * @param saveToCache - Whether to save detected values to cookie (default: true)
 */
export function getUserLocale(
  userFromDB?: UserLocaleFromDB | null,
  saveToCache = true,
): UserLocaleInfo {
  // 1. Check cookie first
  const cookieLanguage = getLanguageFromCookie();
  const cookieCountry = getCountryFromCookie();
  const cookieTimezone = getTimezoneFromCookie();

  if (cookieLanguage && cookieCountry) {
    return {
      language: cookieLanguage,
      country: cookieCountry,
      timezone: cookieTimezone || getUserTimezone(),
      source: 'cookie',
    };
  }

  // 2. Check DB (if logged in)
  if (userFromDB) {
    const dbLanguage = isValidLanguage(userFromDB.language ?? null)
      ? userFromDB.language!
      : userFromDB.locale
        ? getLanguageFromBrowser(userFromDB.locale)
        : null;

    const dbCountry = isValidCountry(userFromDB.country ?? null)
      ? userFromDB.country!
      : isValidCountry(userFromDB.region ?? null)
        ? userFromDB.region!
        : null;

    if (dbLanguage && dbCountry) {
      const dbResult: UserLocaleInfo = {
        language: dbLanguage as SupportedLanguage,
        country: dbCountry as SupportedCountry,
        timezone: userFromDB.timezone || getUserTimezone(),
        source: 'db',
      };

      // Save to cookie for future use
      if (saveToCache) {
        saveLanguageToCookie(dbResult.language);
        saveCountryToCookie(dbResult.country);
        saveTimezoneToCookie(dbResult.timezone);
      }

      return dbResult;
    }
  }

  // 3. Auto-detect from browser
  const autoResult: UserLocaleInfo = {
    language: autoDetectLanguage(),
    country: autoDetectCountry(),
    timezone: getUserTimezone(),
    source: 'auto',
  };

  // Save auto-detected values to cookie for consistency
  if (saveToCache) {
    saveLanguageToCookie(autoResult.language);
    saveCountryToCookie(autoResult.country);
    saveTimezoneToCookie(autoResult.timezone);
  }

  return autoResult;
}

/**
 * Update user's language preference
 * Saves to cookie and returns updated info
 */
export function setUserLanguage(language: SupportedLanguage): UserLocaleInfo {
  saveLanguageToCookie(language);

  return {
    language,
    country: getCountryFromCookie() || autoDetectCountry(),
    timezone: getTimezoneFromCookie() || getUserTimezone(),
    source: 'cookie',
  };
}

/**
 * Update user's country preference
 * Saves to cookie and returns updated info
 */
export function setUserCountry(country: SupportedCountry): UserLocaleInfo {
  saveCountryToCookie(country);

  // Also update language to country's default if not set
  const currentLanguage = getLanguageFromCookie();
  if (!currentLanguage) {
    const countryConfig = getCountryConfig(country);
    if (countryConfig) {
      saveLanguageToCookie(countryConfig.defaultLanguage);
    }
  }

  return {
    language: getLanguageFromCookie() || autoDetectLanguage(),
    country,
    timezone: getTimezoneFromCookie() || getUserTimezone(),
    source: 'cookie',
  };
}

/**
 * Clear cached locale (forces re-detection)
 */
export function clearCachedLocale(): void {
  // Set cookies to expire immediately
  document.cookie = `${LANGUAGE_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  document.cookie = `${COUNTRY_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  document.cookie = `${TIMEZONE_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  // Also clear legacy cookies
  document.cookie = `${LEGACY_REGION_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  document.cookie = `${LEGACY_LOCALE_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

// ============================================
// Legacy Compatibility (for existing ConsentPage)
// ============================================

/**
 * @deprecated Use SupportedCountry instead
 */
export type Region = SupportedCountry;

/**
 * @deprecated Use getUserLocale instead
 */
export function getUserRegion(
  userFromDB?: UserLocaleFromDB | null,
  saveToCache = true,
): UserLocaleInfo & { region: SupportedCountry; locale: string } {
  const localeInfo = getUserLocale(userFromDB, saveToCache);
  return {
    ...localeInfo,
    // Legacy fields
    region: localeInfo.country,
    locale: localeInfo.language,
  };
}

/**
 * @deprecated Use setUserCountry instead
 */
export function setUserRegion(
  region: SupportedCountry,
): UserLocaleInfo & { region: SupportedCountry; locale: string } {
  const localeInfo = setUserCountry(region);
  return {
    ...localeInfo,
    region: localeInfo.country,
    locale: localeInfo.language,
  };
}

/**
 * @deprecated Use getEnabledCountries().map(c => c.code) instead
 */
export function getAllRegions(): SupportedCountry[] {
  return getEnabledCountries().map((c) => c.code);
}

/**
 * @deprecated Use getCountryName instead
 */
export function getRegionName(region: SupportedCountry, locale: string): string {
  return getCountryName(region, locale);
}
