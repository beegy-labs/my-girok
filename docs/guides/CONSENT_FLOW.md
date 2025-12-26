# Consent Flow Guide

> Country-specific consent handling for legal compliance

## Consent Types

### Required (All Countries)

| Type             | Description               |
| ---------------- | ------------------------- |
| TERMS_OF_SERVICE | Service terms agreement   |
| PRIVACY_POLICY   | Data processing agreement |

### Optional

| Type                  | Countries | Description                        |
| --------------------- | --------- | ---------------------------------- |
| MARKETING_EMAIL       | All       | Email marketing                    |
| MARKETING_PUSH        | All       | Push notifications                 |
| MARKETING_PUSH_NIGHT  | KR        | Night push (21:00-08:00, PIPA)     |
| CROSS_BORDER_TRANSFER | JP        | Data transfer outside Japan (APPI) |
| CROSS_SERVICE_SHARING | UNIFIED   | Share between services             |

## Service Join Flow

### 1. Get Requirements

```bash
GET /v1/services/resume/consent-requirements?countryCode=KR
```

### 2. Join with Consents

```bash
POST /v1/services/resume/join
{
  "countryCode": "KR",
  "consents": [
    { "type": "TERMS_OF_SERVICE", "agreed": true, "documentId": "doc-tos-kr" },
    { "type": "PRIVACY_POLICY", "agreed": true, "documentId": "doc-pp-kr" },
    { "type": "MARKETING_EMAIL", "agreed": true }
  ]
}
```

## Update Consent

```bash
PUT /v1/services/resume/consent
{
  "consentType": "MARKETING_EMAIL",
  "countryCode": "KR",
  "agreed": false
}
```

**Note**: Required consents (TERMS, PRIVACY) cannot be withdrawn while active.

## View Consents

```bash
GET /v1/legal/consents
# Returns all user consents with timestamps
```

## Country-Specific Rules

| Country | Regulation | Key Rules                                 |
| ------- | ---------- | ----------------------------------------- |
| KR      | PIPA       | Age 14+, night push consent required      |
| EU      | GDPR       | Age 16+, 365d retention, right to erasure |
| JP      | APPI       | Cross-border transfer consent             |
| US/CA   | CCPA       | Age 13+, "Do Not Sell" option             |

## Guard Usage

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaFeature() {
  // Only accessible with KR consent
}
```

## Audit

All consent changes are logged with:

- Timestamp, IP address, user agent
- Document version (if applicable)

```bash
GET /v1/admin/legal/consents/stats?range=30d
```

## Common Errors

| Error                          | Cause                     |
| ------------------------------ | ------------------------- |
| 400 "Required consent missing" | TERMS/PRIVACY not agreed  |
| 400 "Invalid country code"     | Must be 2-letter ISO code |
| 409 "Consent already exists"   | Use UPDATE instead        |

---

**Related**: [Global Account Policy](../policies/GLOBAL_ACCOUNT.md)
