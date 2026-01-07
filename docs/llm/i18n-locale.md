# i18n & Locale

Language/Country separation for UI and legal compliance

## Supported Locales

| Language | Code | Country | Compliance |
| -------- | ---- | ------- | ---------- |
| Korean   | `ko` | KR      | PIPA       |
| English  | `en` | US/GB   | CCPA/GDPR  |
| Japanese | `ja` | JP      | APPI       |
| Hindi    | `hi` | IN      | DPDP Act   |

## Detection Priority

```
1. Cookie -> 2. DB (logged-in) -> 3. Auto-detect (browser)
```

## Files

```
apps/web-main/src/
  utils/localeConfig.ts, regionDetection.ts
  components/LanguageSwitcher.tsx
  i18n/config.ts, locales/{en,ko,ja,hi}.json
```

## Usage

```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<h1>{t('home.title')}</h1>

// Change language
i18n.changeLanguage('en');
saveLanguageToCookie('en');
```

## Cookies

| Key             | Purpose       | Expiry |
| --------------- | ------------- | ------ |
| `user_language` | UI language   | 1 year |
| `user_country`  | Legal context | 1 year |
| `user_timezone` | Display times | 1 year |

## Config

```typescript
i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```
