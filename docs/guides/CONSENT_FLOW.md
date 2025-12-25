# Consent Flow Guide

> Country-specific consent handling for legal compliance

## Overview

The consent system ensures compliance with various privacy regulations (PIPA, GDPR, APPI, CCPA) by collecting appropriate consents based on user location and service requirements.

## Consent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Law Registry                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  PIPA   │ │  GDPR   │ │  APPI   │ │  CCPA   │       │
│  │  (KR)   │ │  (EU)   │ │  (JP)   │ │  (US)   │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
└───────┼───────────┼───────────┼───────────┼────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────┐
│              Service Consent Requirements                │
│                                                          │
│  Required: TERMS_OF_SERVICE, PRIVACY_POLICY             │
│  Optional: Based on country + service                    │
└─────────────────────────────────────────────────────────┘
```

## Consent Types

### Required Consents (All Countries)

| Type             | Description                  |
| ---------------- | ---------------------------- |
| TERMS_OF_SERVICE | Agreement to service terms   |
| PRIVACY_POLICY   | Agreement to data processing |

### Optional Consents

| Type                  | Countries | Description                 |
| --------------------- | --------- | --------------------------- |
| MARKETING_EMAIL       | All       | Email marketing             |
| MARKETING_PUSH        | All       | Push notifications          |
| MARKETING_PUSH_NIGHT  | KR        | Night push (21:00-08:00)    |
| MARKETING_SMS         | All       | SMS marketing               |
| PERSONALIZED_ADS      | All       | Personalized advertising    |
| THIRD_PARTY_SHARING   | All       | Share data with partners    |
| CROSS_BORDER_TRANSFER | JP        | Transfer data outside Japan |
| CROSS_SERVICE_SHARING | UNIFIED   | Share between services      |

## Service Join Flow

### Step 1: Get Consent Requirements

```bash
GET /v1/services/resume/consent-requirements?countryCode=KR
```

**Response:**

```json
{
  "required": [
    {
      "type": "TERMS_OF_SERVICE",
      "documentId": "doc-tos-kr",
      "version": "2.0"
    },
    {
      "type": "PRIVACY_POLICY",
      "documentId": "doc-pp-kr",
      "version": "3.1"
    }
  ],
  "optional": [
    {
      "type": "MARKETING_EMAIL",
      "description": "Receive promotional emails"
    },
    {
      "type": "MARKETING_PUSH",
      "description": "Receive push notifications"
    },
    {
      "type": "MARKETING_PUSH_NIGHT",
      "description": "Receive notifications at night (21:00-08:00)",
      "regulation": "PIPA Article 22"
    }
  ]
}
```

### Step 2: Join Service with Consents

```bash
POST /v1/services/resume/join
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "countryCode": "KR",
  "consents": [
    {
      "type": "TERMS_OF_SERVICE",
      "agreed": true,
      "documentId": "doc-tos-kr"
    },
    {
      "type": "PRIVACY_POLICY",
      "agreed": true,
      "documentId": "doc-pp-kr"
    },
    {
      "type": "MARKETING_EMAIL",
      "agreed": true
    },
    {
      "type": "MARKETING_PUSH",
      "agreed": false
    }
  ]
}
```

**Response:**

```json
{
  "userService": {
    "id": "user-service-uuid",
    "serviceId": "resume-service-uuid",
    "serviceSlug": "resume",
    "countryCode": "KR",
    "status": "ACTIVE",
    "joinedAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Adding Consent for New Country

When user accesses service from a new country:

### Step 1: Check Required Consents

```bash
GET /v1/services/resume/consent-requirements?countryCode=JP
```

### Step 2: Add Country Consent

```bash
POST /v1/services/resume/consent/JP
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "consents": [
    {
      "type": "PRIVACY_POLICY",
      "agreed": true,
      "documentId": "doc-pp-jp"
    },
    {
      "type": "CROSS_BORDER_TRANSFER",
      "agreed": true
    }
  ]
}
```

## Updating Consent

### Opt-in/Opt-out

```bash
PUT /v1/services/resume/consent
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "consentType": "MARKETING_EMAIL",
  "countryCode": "KR",
  "agreed": false
}
```

**Note:** Required consents (TERMS, PRIVACY) cannot be withdrawn while service is active.

## Viewing Current Consents

```bash
GET /v1/legal/consents
Authorization: Bearer <user-token>
```

**Response:**

```json
[
  {
    "id": "consent-uuid",
    "consentType": "TERMS_OF_SERVICE",
    "countryCode": "KR",
    "documentId": "doc-tos-kr",
    "agreed": true,
    "agreedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "consent-uuid-2",
    "consentType": "MARKETING_EMAIL",
    "countryCode": "KR",
    "agreed": true,
    "agreedAt": "2024-01-15T10:00:00Z"
  }
]
```

## Country-Specific Rules

### Korea (PIPA)

- Minimum age: 14
- Night push consent required for 21:00-08:00 notifications
- Explicit consent for each marketing channel

### EU (GDPR)

- Minimum age: 16 (or 13-16 depending on member state)
- Right to erasure (data deletion)
- Data retention: Maximum 365 days for inactive accounts
- Parental consent for users under 16

### Japan (APPI)

- Explicit consent required for cross-border data transfer
- Clear purpose specification for data use

### US California (CCPA)

- Minimum age: 13
- "Do Not Sell" option required
- Right to know what data is collected

## Consent Validation

The system validates consents at multiple points:

1. **Service Join**: All required consents must be agreed
2. **Country Access**: CountryConsentGuard checks country-specific consent
3. **Feature Access**: Some features require specific consents (e.g., marketing)

### CountryConsentGuard Example

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaSpecificFeature() {
  // Only accessible if user has KR country consent
}
```

## Consent Audit

All consent changes are logged with:

- Timestamp
- IP address
- User agent
- Document version (if applicable)

```bash
GET /v1/admin/legal/consents/stats?range=30d
Authorization: Bearer <admin-token>
```

## Best Practices

1. **Document Versioning**: Track document versions for legal compliance
2. **Granular Consent**: Collect separate consent for each purpose
3. **Easy Withdrawal**: Make opt-out as easy as opt-in
4. **Clear Language**: Use plain language in consent descriptions
5. **Audit Trail**: Log all consent changes with context

## Error Handling

### "Required consent missing" (400)

User didn't agree to required consent. Check:

- TERMS_OF_SERVICE
- PRIVACY_POLICY

### "Invalid country code" (400)

Country code must be 2-letter ISO code (KR, JP, US, etc.)

### "Consent already exists" (409)

Duplicate consent for same type/country. Use UPDATE instead.

---

**Related:**

- [Global Account Policy](../policies/GLOBAL_ACCOUNT.md)
- [Account Linking](./ACCOUNT_LINKING.md)
- [Legal & Consent Policy](../policies/LEGAL_CONSENT.md)
