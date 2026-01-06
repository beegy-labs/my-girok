# i18n & Locale System

> Language/Country separation for UI and legal compliance | **Last Updated**: 2026-01-06

## Supported Locales

| Language | Code | Country     | Code      | Compliance |
| -------- | ---- | ----------- | --------- | ---------- |
| Korean   | `ko` | South Korea | `KR`      | PIPA       |
| English  | `en` | US/UK       | `US`/`GB` | CCPA/GDPR  |
| Japanese | `ja` | Japan       | `JP`      | APPI       |
| Hindi    | `hi` | India       | `IN`      | DPDP Act   |

## Detection Priority

```
1. Cookie → 2. DB (logged-in) → 3. Auto-detect (browser)
```

## Key Files

```
apps/web-main/src/
├── utils/localeConfig.ts      # SSOT config
├── utils/regionDetection.ts   # Detection utilities
├── components/LanguageSwitcher.tsx
└── i18n/
    ├── config.ts
    └── locales/{en,ko,ja,hi}.json
```

## Usage

### LanguageSwitcher

```typescript
const languages = useMemo(() => getEnabledLanguages(), []);

const handleLanguageChange = useCallback(
  (lng: SupportedLanguage) => () => {
    i18n.changeLanguage(lng);
    saveLanguageToCookie(lng);
  },
  [i18n],
);
```

### Translation

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <h1>{t('home.title')}</h1>;
```

## Cookie Storage

| Key             | Purpose       | Expiry |
| --------------- | ------------- | ------ |
| `user_language` | UI language   | 1 year |
| `user_country`  | Legal context | 1 year |
| `user_timezone` | Display times | 1 year |

## i18next Config

```typescript
i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

## Performance

```typescript
// Module-level caching
let _cachedLanguages: LanguageConfig[] | null = null;
export function getEnabledLanguages() {
  if (!_cachedLanguages) {
    _cachedLanguages = SUPPORTED_LANGUAGES.filter(l => l.enabled).sort(...);
  }
  return _cachedLanguages;
}

// Component memoization
const languages = useMemo(() => getEnabledLanguages(), []);
```

---

**Full guide**: `docs/I18N.md`
