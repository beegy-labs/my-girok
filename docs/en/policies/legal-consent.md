# Legal & Consent Policy

> GDPR, PIPA, and CCPA compliance for consent management

## Regulatory Compliance

| Regulation | Region        | Key Requirements                          |
| ---------- | ------------- | ----------------------------------------- |
| GDPR       | EU            | 72h breach notification, data portability |
| PIPA       | Korea         | Night push consent (21:00-08:00), age 14+ |
| CCPA       | US-California | "Do not sell" option, disclosure rights   |

## Consent Types

### Required Consents (Cannot Proceed Without)

| Type             | Legal Basis          |
| ---------------- | -------------------- |
| TERMS_OF_SERVICE | Contract performance |
| PRIVACY_POLICY   | Legal obligation     |

### Optional Consents

| Type                 | Legal Basis      | Notes             |
| -------------------- | ---------------- | ----------------- |
| MARKETING_EMAIL      | Explicit consent |                   |
| MARKETING_PUSH       | Explicit consent |                   |
| MARKETING_PUSH_NIGHT | Explicit consent | Korea only (PIPA) |
| MARKETING_SMS        | Explicit consent |                   |
| PERSONALIZED_ADS     | Explicit consent |                   |
| THIRD_PARTY_SHARING  | Explicit consent |                   |

## Country-Locale Mapping

| Country | Locale | Applicable Law |
| ------- | ------ | -------------- |
| KR      | ko     | PIPA           |
| JP      | ja     | APPI           |
| US      | en     | CCPA           |
| GB      | en     | GDPR           |
| DE      | de     | GDPR           |
| FR      | fr     | GDPR           |

```typescript
const locale = COUNTRY_TO_LOCALE[detectedCountry] || 'en';
```

## Registration Flow

```typescript
POST /v1/auth/register
{
  email: "user@example.com",
  password: "secure-password",
  username: "user123",
  consents: [
    { type: "TERMS_OF_SERVICE", agreed: true },
    { type: "PRIVACY_POLICY", agreed: true },
    { type: "MARKETING_EMAIL", agreed: false }
  ],
  country: "KR",
  language: "ko",
  timezone: "Asia/Seoul"
}
```

## Audit Trail Requirements

All consent changes must be logged with:

```yaml
required_fields:
  - user_id
  - consent_type
  - action (agreed/withdrawn)
  - timestamp (ISO 8601)
  - ip_address
  - user_agent
  - document_version
```

## Document Versioning

| Version Change  | Re-consent Required |
| --------------- | ------------------- |
| v1.0.0 → v1.1.0 | No (minor change)   |
| v1.1.0 → v2.0.0 | Yes (major change)  |

## Data Retention Policy

| Data Type       | Retention Period           |
| --------------- | -------------------------- |
| Consent records | 5 years after withdrawal   |
| User accounts   | Until deletion request     |
| Marketing data  | 2 years from last activity |
| Login history   | 1 year                     |

## Consent Withdrawal

```typescript
PUT /v1/legal/consents/:type
{ agreed: false }
```

| Consent Type     | Withdrawable | Effect                         |
| ---------------- | ------------ | ------------------------------ |
| PRIVACY_POLICY   | No           | Triggers account deletion flow |
| TERMS_OF_SERVICE | No           | Triggers account deletion flow |
| MARKETING\_\*    | Yes          | Stops respective marketing     |

## Data Breach Notification

| Regulation | Timeline                              |
| ---------- | ------------------------------------- |
| GDPR       | 72 hours to supervisory authority     |
| All        | Without undue delay to affected users |

## Privacy by Design Principles

| Principle          | Implementation                      |
| ------------------ | ----------------------------------- |
| Data Minimization  | Collect only necessary data         |
| Purpose Limitation | New purpose requires new consent    |
| Security           | Encrypt data at rest and in transit |
| Transparency       | Clear privacy notices               |
| User Control       | Easy consent management UI          |

---

**LLM Reference**: `docs/llm/policies/LEGAL_CONSENT.md`
