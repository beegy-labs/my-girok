# i18n & Locale System

> Language/Country separation for UI and legal compliance | **Last Updated**: 2026-01-11

## Supported Locales

| Language | Code | Country | Compliance |
| -------- | ---- | ------- | ---------- |
| Korean   | `ko` | KR      | PIPA       |
| English  | `en` | US/GB   | CCPA/GDPR  |
| Japanese | `ja` | JP      | APPI       |
| Hindi    | `hi` | IN      | DPDP Act   |

## Detection Priority

```
Cookie → DB (logged-in) → Browser (auto-detect)
```

## Usage

```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
return <h1>{t('home.title')}</h1>;
```

## Cookie Keys

| Key             | Purpose       | Expiry |
| --------------- | ------------- | ------ |
| `user_language` | UI language   | 1 year |
| `user_country`  | Legal context | 1 year |

## Key Files

```
apps/web-girok/src/
├── utils/localeConfig.ts      # SSOT config
├── components/LanguageSwitcher.tsx
└── i18n/locales/{en,ko,ja,hi}.json
```

**SSOT**: `docs/llm/i18n-locale.md`
