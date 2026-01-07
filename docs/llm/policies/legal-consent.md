# Legal & Consent

## Compliance

| Regulation | Region | Key                                 |
| ---------- | ------ | ----------------------------------- |
| GDPR       | EU     | 72h breach notify, data portability |
| PIPA       | KR     | Night push consent (21-08), age 14+ |
| CCPA       | US-CA  | Do not sell, disclosure             |

## Consent Types

### Required

| Type             | Legal Basis      |
| ---------------- | ---------------- |
| TERMS_OF_SERVICE | Contract         |
| PRIVACY_POLICY   | Legal obligation |

### Optional

| Type                 | Basis   | Note       |
| -------------------- | ------- | ---------- |
| MARKETING_EMAIL      | Consent |            |
| MARKETING_PUSH       | Consent |            |
| MARKETING_PUSH_NIGHT | Consent | Korea only |
| MARKETING_SMS        | Consent |            |
| PERSONALIZED_ADS     | Consent |            |
| THIRD_PARTY_SHARING  | Consent |            |

## Country-Locale Map

| Country | Locale | Law  |
| ------- | ------ | ---- |
| KR      | ko     | PIPA |
| JP      | ja     | APPI |
| US      | en     | CCPA |
| GB      | en     | GDPR |
| DE      | de     | GDPR |
| FR      | fr     | GDPR |

```typescript
const locale = COUNTRY_TO_LOCALE[detectedCountry] || 'en';
```

## Registration

```typescript
POST /v1/auth/register
{
  email, password, username,
  consents: [
    { type: 'TERMS_OF_SERVICE', agreed: true },
    { type: 'PRIVACY_POLICY', agreed: true },
    { type: 'MARKETING_EMAIL', agreed: false },
  ],
  country: 'KR',
  language: 'ko',
  timezone: 'Asia/Seoul'
}
```

## Audit Trail

```yaml
required_fields:
  - user_id
  - consent_type
  - agreed/withdrawn
  - timestamp
  - ip_address
  - user_agent
  - document_version
```

## Document Versioning

| Version | Re-consent  |
| ------- | ----------- |
| v1.1.0  | No (minor)  |
| v2.0.0  | Yes (major) |

## Data Retention

| Data            | Retention              |
| --------------- | ---------------------- |
| Consent records | 5y after withdrawal    |
| User accounts   | Until deletion request |
| Marketing data  | 2y from last activity  |
| Login history   | 1y                     |

## Withdrawal

```typescript
PUT /v1/legal/consents/:type
{ agreed: false }
```

| Consent        | Withdrawable | Effect                    |
| -------------- | ------------ | ------------------------- |
| PRIVACY_POLICY | No           | Triggers account deletion |
| MARKETING\_\*  | Yes          | Stop respective marketing |

## Breach Notification

| Regulation | Timeline                     |
| ---------- | ---------------------------- |
| GDPR       | 72 hours to authority        |
| All        | Without undue delay to users |

## Privacy by Design

| Principle          | Action                    |
| ------------------ | ------------------------- |
| Data Minimization  | Collect only necessary    |
| Purpose Limitation | New purpose = new consent |
| Security           | Encrypt at rest & transit |
