# i18n & Locale

> Language and country separation for UI localization and legal compliance

## Overview

The project separates language preferences from country/region settings. This enables proper localization while ensuring compliance with regional data protection laws.

## Supported Locales

| Language | Code | Country | Compliance |
| -------- | ---- | ------- | ---------- |
| Korean   | `ko` | KR      | PIPA       |
| English  | `en` | US/GB   | CCPA/GDPR  |
| Japanese | `ja` | JP      | APPI       |
| Hindi    | `hi` | IN      | DPDP Act   |

Each locale combination determines both the UI language and the applicable legal framework for data handling.

## Detection Priority

Language detection follows a priority cascade:

```
1. Cookie -> 2. DB (logged-in) -> 3. Auto-detect (browser)
```

1. **Cookie**: First checks for user-saved preference
2. **Database**: For logged-in users, retrieves stored preference
3. **Auto-detect**: Falls back to browser's Accept-Language header

## File Organization

```
apps/web-main/src/
  utils/localeConfig.ts, regionDetection.ts
  components/LanguageSwitcher.tsx
  i18n/config.ts, locales/{en,ko,ja,hi}.json
```

## Usage

### Basic Translation

```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<h1>{t('home.title')}</h1>

// Change language
i18n.changeLanguage('en');
saveLanguageToCookie('en');
```

### Language Switching

When the user changes their language preference, both the cookie and i18n instance should be updated to ensure persistence across sessions.

## Cookies

| Key             | Purpose       | Expiry |
| --------------- | ------------- | ------ |
| `user_language` | UI language   | 1 year |
| `user_country`  | Legal context | 1 year |
| `user_timezone` | Display times | 1 year |

These cookies work together:

- `user_language`: Controls the UI text language
- `user_country`: Determines which legal requirements apply (consent forms, data handling)
- `user_timezone`: Formats dates and times appropriately

## Configuration

```typescript
i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

The configuration sets Korean as the default language with English as the fallback for missing translations.

---

**LLM Reference**: `docs/llm/i18n-locale.md`
