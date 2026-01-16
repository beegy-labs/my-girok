/**
 * Locale Configuration
 * Centralized configuration for supported languages and countries
 * Designed for future admin management via API
 *
 * Service Languages: Korean, English, Japanese, Hindi (4)
 * Service Countries: Korea, Japan, USA, UK, India (5)
 */

// ============================================
// Type Definitions
// ============================================

/**
 * Supported service language codes
 * ISO 639-1 standard
 */
export type SupportedLanguage = 'ko' | 'en' | 'ja' | 'hi';

/**
 * Supported service country codes
 * ISO 3166-1 alpha-2 standard
 */
export type SupportedCountry = 'KR' | 'JP' | 'US' | 'GB' | 'IN';

/**
 * Language configuration item
 * Can be fetched from admin API in the future
 */
export interface LanguageConfig {
  code: SupportedLanguage;
  nativeName: string; // Name in native language
  englishName: string;
  enabled: boolean;
  order: number;
}

/**
 * Country configuration item
 * Can be fetched from admin API in the future
 */
export interface CountryConfig {
  code: SupportedCountry;
  names: Record<string, string>; // Localized names by language code
  defaultLanguage: SupportedLanguage; // Default UI language for this country
  enabled: boolean;
  order: number;
}

// ============================================
// Default Configuration (Static, Admin-manageable)
// ============================================

/**
 * Supported languages configuration
 * Future: Fetch from /api/admin/languages
 */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    enabled: true,
    order: 1,
  },
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    enabled: true,
    order: 2,
  },
  {
    code: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    enabled: true,
    order: 3,
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    enabled: true,
    order: 4,
  },
];

/**
 * Supported countries configuration
 * Future: Fetch from /api/admin/countries
 */
export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'KR',
    names: {
      ko: '대한민국',
      en: 'South Korea',
      ja: '韓国',
      hi: 'दक्षिण कोरिया',
    },
    defaultLanguage: 'ko',
    enabled: true,
    order: 1,
  },
  {
    code: 'JP',
    names: {
      ko: '일본',
      en: 'Japan',
      ja: '日本',
      hi: 'जापान',
    },
    defaultLanguage: 'ja',
    enabled: true,
    order: 2,
  },
  {
    code: 'US',
    names: {
      ko: '미국',
      en: 'United States',
      ja: 'アメリカ',
      hi: 'संयुक्त राज्य अमेरिका',
    },
    defaultLanguage: 'en',
    enabled: true,
    order: 3,
  },
  {
    code: 'GB',
    names: {
      ko: '영국',
      en: 'United Kingdom',
      ja: 'イギリス',
      hi: 'यूनाइटेड किंगडम',
    },
    defaultLanguage: 'en',
    enabled: true,
    order: 4,
  },
  {
    code: 'IN',
    names: {
      ko: '인도',
      en: 'India',
      ja: 'インド',
      hi: 'भारत',
    },
    defaultLanguage: 'hi',
    enabled: true,
    order: 5,
  },
];

// ============================================
// Timezone to Country Mapping
// ============================================

/**
 * Timezone to country mapping for auto-detection
 */
export const TIMEZONE_TO_COUNTRY: Record<string, SupportedCountry> = {
  // Korea
  'Asia/Seoul': 'KR',
  // Japan
  'Asia/Tokyo': 'JP',
  // USA
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Phoenix': 'US',
  'Pacific/Honolulu': 'US',
  // UK
  'Europe/London': 'GB',
  // India
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
};

/**
 * Browser language to preferred language mapping
 */
export const BROWSER_LANG_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  ko: 'ko',
  'ko-KR': 'ko',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',
  'en-IN': 'en',
  ja: 'ja',
  'ja-JP': 'ja',
  hi: 'hi',
  'hi-IN': 'hi',
};

/**
 * Browser language to default country mapping
 * Used when timezone detection fails
 */
export const BROWSER_LANG_TO_COUNTRY: Record<string, SupportedCountry> = {
  ko: 'KR',
  'ko-KR': 'KR',
  ja: 'JP',
  'ja-JP': 'JP',
  hi: 'IN',
  'hi-IN': 'IN',
  'en-US': 'US',
  'en-GB': 'GB',
  'en-IN': 'IN',
  // Default English to US
  en: 'US',
  'en-AU': 'US',
  'en-CA': 'US',
};

// ============================================
// Helper Functions
// ============================================

// Module-level cache for enabled lists (avoid repeated filtering/sorting)
let _cachedEnabledLanguages: LanguageConfig[] | null = null;
let _cachedEnabledCountries: CountryConfig[] | null = null;

/**
 * Get enabled languages sorted by order (cached)
 */
export function getEnabledLanguages(): LanguageConfig[] {
  if (!_cachedEnabledLanguages) {
    _cachedEnabledLanguages = SUPPORTED_LANGUAGES.filter((lang) => lang.enabled).sort(
      (a, b) => a.order - b.order,
    );
  }
  return _cachedEnabledLanguages;
}

/**
 * Get enabled countries sorted by order (cached)
 */
export function getEnabledCountries(): CountryConfig[] {
  if (!_cachedEnabledCountries) {
    _cachedEnabledCountries = SUPPORTED_COUNTRIES.filter((country) => country.enabled).sort(
      (a, b) => a.order - b.order,
    );
  }
  return _cachedEnabledCountries;
}

/**
 * Get language config by code
 */
export function getLanguageConfig(code: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get country config by code
 */
export function getCountryConfig(code: string): CountryConfig | undefined {
  return SUPPORTED_COUNTRIES.find((country) => country.code === code);
}

/**
 * Get localized country name
 */
export function getCountryName(countryCode: SupportedCountry, locale: string): string {
  const country = getCountryConfig(countryCode);
  if (!country) return countryCode;

  const baseLang = locale.split('-')[0];
  return country.names[baseLang] || country.names['en'] || countryCode;
}

/**
 * Get language display name (native or English based on preference)
 */
export function getLanguageName(langCode: SupportedLanguage, showNative = true): string {
  const language = getLanguageConfig(langCode);
  if (!language) return langCode;

  return showNative ? language.nativeName : language.englishName;
}

/**
 * Check if language code is supported
 */
export function isValidLanguage(code: string | null): code is SupportedLanguage {
  if (!code) return false;
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code && lang.enabled);
}

/**
 * Check if country code is supported
 */
export function isValidCountry(code: string | null): code is SupportedCountry {
  if (!code) return false;
  return SUPPORTED_COUNTRIES.some((country) => country.code === code && country.enabled);
}

/**
 * Get country codes array
 */
export function getAllCountryCodes(): SupportedCountry[] {
  return getEnabledCountries().map((c) => c.code);
}

/**
 * Get language codes array
 */
export function getAllLanguageCodes(): SupportedLanguage[] {
  return getEnabledLanguages().map((l) => l.code);
}
