# Legal & Consent Policy

> Compliance guidelines for GDPR, PIPA, and consent management

## Overview

This document outlines the legal and consent management policies for the my-girok platform, ensuring compliance with:

- **GDPR** (General Data Protection Regulation) - EU
- **PIPA** (Personal Information Protection Act) - South Korea
- **CCPA** (California Consumer Privacy Act) - US California

## Consent Types

### Required Consents

Users **MUST** agree to these before registration:

| Type               | Description                      | Legal Basis      |
| ------------------ | -------------------------------- | ---------------- |
| `TERMS_OF_SERVICE` | Service usage agreement          | Contract         |
| `PRIVACY_POLICY`   | Personal data collection & usage | Legal obligation |

### Optional Consents

Users **MAY** opt-in to these:

| Type                   | Description                       | Legal Basis              |
| ---------------------- | --------------------------------- | ------------------------ |
| `MARKETING_EMAIL`      | Promotional emails                | Consent                  |
| `MARKETING_PUSH`       | Push notifications                | Consent                  |
| `MARKETING_PUSH_NIGHT` | Night-time push (21:00-08:00 KST) | Consent (Korea-specific) |
| `MARKETING_SMS`        | SMS marketing                     | Consent                  |
| `PERSONALIZED_ADS`     | Targeted advertising              | Consent                  |
| `THIRD_PARTY_SHARING`  | Data sharing with partners        | Consent                  |

## Regional Requirements

### South Korea (PIPA)

1. **Night-time Push Consent**: Separate consent required for push notifications between 21:00-08:00
2. **Marketing Consent Separation**: Email, SMS, and Push consents must be separately obtained
3. **Consent Withdrawal**: Must be as easy as giving consent
4. **Data Retention**: Personal data must be deleted when no longer needed

### European Union (GDPR)

1. **Explicit Consent**: Clear affirmative action required
2. **Right to Erasure**: Users can request complete data deletion
3. **Data Portability**: Users can export their data
4. **Consent Records**: Must maintain audit trail of all consents

### United States (CCPA - California)

1. **Do Not Sell**: Option to opt-out of data sales
2. **Disclosure**: Must disclose data collection practices
3. **Non-Discrimination**: Cannot discriminate against users who exercise rights

## Implementation Guidelines

### Country-to-Locale Mapping

The consent flow uses **country** (not language) to determine regional requirements:

| Country | Locale | Law  |
| ------- | ------ | ---- |
| KR      | ko     | PIPA |
| JP      | ja     | APPI |
| US      | en     | CCPA |
| GB      | en     | GDPR |
| DE      | de     | GDPR |
| FR      | fr     | GDPR |
| IN      | hi     | DPDP |

```typescript
// Country to locale mapping (ConsentPage.tsx)
const COUNTRY_TO_LOCALE: Record<string, string> = {
  KR: 'ko',
  JP: 'ja',
  US: 'en',
  GB: 'en',
  DE: 'de',
  FR: 'fr',
  IN: 'hi',
};

// API call uses country-mapped locale
const locale = COUNTRY_TO_LOCALE[detectedCountry] || 'en';
const requirements = await getConsentRequirements(locale);
```

### Consent Collection

```typescript
// Registration flow with consents
POST /v1/auth/register
{
  email: string,
  password: string,
  username: string,
  consents: [
    { type: 'TERMS_OF_SERVICE', agreed: true },      // Required
    { type: 'PRIVACY_POLICY', agreed: true },        // Required
    { type: 'MARKETING_EMAIL', agreed: false },      // Optional
    { type: 'MARKETING_PUSH', agreed: true },        // Optional
  ],
  country: 'KR',    // For regional policy
  language: 'ko',   // For localized documents
  timezone: 'Asia/Seoul'
}
```

### Consent Audit Trail

Every consent action must be logged with:

- User ID
- Consent type
- Agreed/Withdrawn status
- Timestamp
- IP Address
- User Agent
- Document version (for legal documents)

### Document Versioning

Legal documents must be versioned:

```
v1.0.0 - Initial version
v1.1.0 - Minor updates (no re-consent required)
v2.0.0 - Major updates (re-consent required)
```

When a major version is released:

1. Notify users of changes
2. Require re-consent on next login
3. Maintain previous version for audit purposes

## Data Retention

| Data Type       | Retention Period           | Notes             |
| --------------- | -------------------------- | ----------------- |
| Consent records | 5 years after withdrawal   | Legal requirement |
| User accounts   | Until deletion request     | User-controlled   |
| Marketing data  | 2 years from last activity | Auto-cleanup      |
| Login history   | 1 year                     | Security purposes |

## Consent Withdrawal

### API Endpoint

```typescript
// Withdraw consent
PUT /v1/legal/consents/:type
{
  agreed: false
}
```

### Process

1. User requests withdrawal
2. System records withdrawal timestamp
3. Related processing stops immediately
4. Audit trail maintained
5. User notified of successful withdrawal

### Restrictions

- **Cannot withdraw** required consents while maintaining account
- Withdrawing `PRIVACY_POLICY` triggers account deletion flow

## Privacy by Design

### Data Minimization

- Collect only necessary data
- Don't store sensitive data longer than needed
- Anonymize data when possible

### Purpose Limitation

- Use data only for stated purposes
- New purposes require new consent

### Security Measures

- Encrypt personal data at rest and in transit
- Implement access controls
- Regular security audits

## Incident Response

### Data Breach Notification

1. **72 hours**: Report to supervisory authority (GDPR)
2. **Without undue delay**: Notify affected users
3. **Document**: All breaches, even minor ones

### Required Information

- Nature of breach
- Categories of data affected
- Approximate number of users affected
- Measures taken to address breach
- Contact point for more information

## Annual Review

This policy must be reviewed annually to ensure:

1. Compliance with latest regulations
2. Alignment with business practices
3. Technical implementation accuracy

**Last Review**: December 2024
**Next Review**: December 2025

## Related Documents

- `.ai/services/auth-service.md` - Legal API implementation
- `.ai/packages/types.md` - Consent type definitions
- `docs/policies/SECURITY.md` - Security policies
- `docs/policies/DEPLOYMENT.md` - Data handling in deployment

## Contact

For legal/privacy inquiries:

- Privacy Officer: privacy@girok.dev
- Legal Team: legal@girok.dev
