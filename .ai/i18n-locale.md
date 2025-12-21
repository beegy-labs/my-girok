# Internationalization & Locale System

> Language/Country separation for UI localization and legal compliance

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Locale Detection Flow                        │
├─────────────────────────────────────────────────────────────────┤
│  Priority: 1. Cookie → 2. DB (logged-in) → 3. Auto-detect      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Separation of Concerns                       │
├─────────────────┬───────────────────────────────────────────────┤
│    Language     │                Country                        │
│  (UI Display)   │        (Legal/Regulatory Context)            │
├─────────────────┼───────────────────────────────────────────────┤
│  Header select  │  ConsentPage select (Registration)           │
│  i18n strings   │  GDPR/PIPA/CCPA compliance                   │
│  Cookie storage │  Consent policy by jurisdiction              │
└─────────────────┴───────────────────────────────────────────────┘
```

## Supported Locales

### Languages (4)

| Code | Native Name | English Name | Default For |
| ---- | ----------- | ------------ | ----------- |
| `ko` | 한국어      | Korean       | KR          |
| `en` | English     | English      | US, GB      |
| `ja` | 日本語      | Japanese     | JP          |
| `hi` | हिन्दी      | Hindi        | IN          |

### Countries (5)

| Code | Country        | Default Language | Compliance |
| ---- | -------------- | ---------------- | ---------- |
| `KR` | South Korea    | `ko`             | PIPA       |
| `JP` | Japan          | `ja`             | APPI       |
| `US` | United States  | `en`             | CCPA       |
| `GB` | United Kingdom | `en`             | UK GDPR    |
| `IN` | India          | `hi`             | DPDP Act   |

## Key Files

```
apps/web-main/src/
├── utils/
│   ├── localeConfig.ts      # SSOT: Languages, Countries config
│   └── regionDetection.ts   # Detection & storage utilities
├── components/
│   └── LanguageSwitcher.tsx # Header language selector
├── pages/
│   └── ConsentPage.tsx      # Country selector (registration)
└── i18n/
    ├── config.ts            # i18next configuration
    └── locales/
        ├── en.json
        ├── ko.json
        ├── ja.json
        └── hi.json
```

## Configuration (localeConfig.ts)

### Type Definitions

```typescript
// ISO 639-1 language codes
type SupportedLanguage = 'ko' | 'en' | 'ja' | 'hi';

// ISO 3166-1 alpha-2 country codes
type SupportedCountry = 'KR' | 'JP' | 'US' | 'GB' | 'IN';

interface LanguageConfig {
  code: SupportedLanguage;
  nativeName: string; // 한국어, English, 日本語, हिन्दी
  englishName: string;
  enabled: boolean;
  order: number;
}

interface CountryConfig {
  code: SupportedCountry;
  names: Record<string, string>; // Localized country names
  defaultLanguage: SupportedLanguage;
  enabled: boolean;
  order: number;
}
```

### SSOT Configuration

```typescript
// Future: Fetch from /api/admin/languages
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', enabled: true, order: 1 },
  { code: 'en', nativeName: 'English', englishName: 'English', enabled: true, order: 2 },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', enabled: true, order: 3 },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', enabled: true, order: 4 },
];

// Future: Fetch from /api/admin/countries
export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  { code: 'KR', names: { ko: '대한민국', en: 'South Korea', ... }, defaultLanguage: 'ko', ... },
  { code: 'JP', names: { ko: '일본', en: 'Japan', ... }, defaultLanguage: 'ja', ... },
  // ... more countries
];
```

### Helper Functions (Cached)

```typescript
// Module-level caching for performance
let _cachedEnabledLanguages: LanguageConfig[] | null = null;

export function getEnabledLanguages(): LanguageConfig[] {
  if (!_cachedEnabledLanguages) {
    _cachedEnabledLanguages = SUPPORTED_LANGUAGES.filter((lang) => lang.enabled).sort(
      (a, b) => a.order - b.order,
    );
  }
  return _cachedEnabledLanguages;
}

// Similar pattern for getEnabledCountries()
```

## Detection Flow (regionDetection.ts)

### Priority Chain

```typescript
export function getUserLocale(
  userFromDB?: UserLocaleFromDB | null,
  saveToCache = true,
): UserLocaleInfo {
  // 1. Check cookie first
  const cookieLanguage = getLanguageFromCookie();
  const cookieCountry = getCountryFromCookie();
  if (cookieLanguage && cookieCountry) {
    return { language, country, timezone, source: 'cookie' };
  }

  // 2. Check DB (if logged in)
  if (userFromDB) {
    // Extract from user record with legacy field fallback
    return { ...dbResult, source: 'db' };
  }

  // 3. Auto-detect from browser
  return {
    language: autoDetectLanguage(), // Browser language
    country: autoDetectCountry(), // Timezone → Browser lang
    timezone: getUserTimezone(),
    source: 'auto',
  };
}
```

### Auto-Detection Methods

```typescript
// Language: Browser settings
function autoDetectLanguage(): SupportedLanguage {
  const browserLang = navigator.language; // e.g., 'ko-KR'
  return getLanguageFromBrowser(browserLang) || 'en';
}

// Country: Timezone first (most accurate), then browser lang
function autoDetectCountry(): SupportedCountry {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    getCountryFromTimezone(timezone) || getCountryFromBrowserLanguage(navigator.language) || 'US'
  );
}
```

### Cookie Storage

```typescript
const LANGUAGE_COOKIE_KEY = 'user_language';
const COUNTRY_COOKIE_KEY = 'user_country';
const TIMEZONE_COOKIE_KEY = 'user_timezone';

// Expires: 1 year
export function saveLanguageToCookie(language: SupportedLanguage): void {
  setCookie(LANGUAGE_COOKIE_KEY, language, { expires: 365 });
}
```

## UI Components

### LanguageSwitcher (Header)

**Location**: `components/LanguageSwitcher.tsx`

**Purpose**: Global language selection in navbar

```typescript
// Uses localeConfig for SSOT
const languages = useMemo(() => getEnabledLanguages(), []);

const handleLanguageChange = useCallback(
  (lng: SupportedLanguage) => () => {
    i18n.changeLanguage(lng); // Update i18n
    saveLanguageToCookie(lng); // Persist to cookie
    localStorage.setItem('language', lng); // Backup storage
  },
  [i18n],
);
```

**Styling (V0.0.1)**:

- Button: 2-letter code (KO, EN, JA, HI)
- Dropdown: `rounded-soft` (12px), `border-theme-border-subtle`
- No flags, native names only (한국어, English, 日本語, हिन्दी)

### ConsentPage Country Selector

**Location**: `pages/ConsentPage.tsx`

**Purpose**: Country selection during registration for legal compliance

```typescript
// Country-only selector (language moved to Header)
const enabledCountries = useMemo(() => getEnabledCountries(), []);

const handleCountryChange = useCallback((newCountry: SupportedCountry) => {
  const updated = setUserCountry(newCountry);
  setLocaleInfo(updated);
  setShowCountrySelector(false);
}, []);
```

**Features**:

- Auto-detected country shown with "Auto" badge
- Localized country names by current language
- Stored in sessionStorage for registration flow

## Registration Flow

```
ConsentPage                    RegisterPage
    │                               │
    ▼                               ▼
┌──────────────────┐    ┌──────────────────────────┐
│ Select Country   │───▶│ sessionStorage:          │
│ (legal context)  │    │ - registration_consents  │
│                  │    │ - registration_locale_info│
│ Language: Header │    │                          │
└──────────────────┘    └──────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────────┐
                        │ API: register()          │
                        │ - language               │
                        │ - country                │
                        │ - timezone               │
                        │ - consents[]             │
                        └──────────────────────────┘
```

## i18n Configuration

### i18next Setup

```typescript
// i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
  hi: { translation: hi },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

### Translation Keys (Consent)

```json
{
  "consent": {
    "title": "Consent",
    "country": "Country",
    "autoDetected": "Auto",
    "termsOfService": "Terms of Service",
    "privacyPolicy": "Privacy Policy"
  }
}
```

## Future: Config Service

**GitHub Issue**: #305

When implemented, locale config will be fetched from API:

```typescript
// Future API integration
async function fetchLocaleConfig(): Promise<{
  languages: LanguageConfig[];
  countries: CountryConfig[];
}> {
  return await configApi.get('/v1/config/locales');
}
```

This enables:

- Admin-managed language/country settings
- Dynamic enable/disable without deployment
- Country-specific consent policies from backend

## Performance Patterns

### Module-Level Caching

```typescript
// ✅ DO: Cache filtered/sorted results
let _cachedEnabledLanguages: LanguageConfig[] | null = null;
export function getEnabledLanguages(): LanguageConfig[] {
  if (!_cachedEnabledLanguages) {
    _cachedEnabledLanguages = SUPPORTED_LANGUAGES.filter(...).sort(...);
  }
  return _cachedEnabledLanguages;
}
```

### Component Memoization

```typescript
// ✅ DO: useMemo for config access
const enabledLanguages = useMemo(() => getEnabledLanguages(), []);

// ✅ DO: useCallback for handlers
const handleLanguageChange = useCallback((lng) => { ... }, [i18n]);
```

## References

- **Web App Guide**: `.ai/apps/web-main.md`
- **SSOT Design**: `.ai/ssot.md`
- **Over-Engineering Rules**: `.ai/rules.md` (lines 269-304)
