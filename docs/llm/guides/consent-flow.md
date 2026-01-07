# Consent Flow

## Consent Types

### Required (All Countries)

| Type             | Purpose         |
| ---------------- | --------------- |
| TERMS_OF_SERVICE | Service terms   |
| PRIVACY_POLICY   | Data processing |

### Optional

| Type                  | Countries | Purpose                        |
| --------------------- | --------- | ------------------------------ |
| MARKETING_EMAIL       | All       | Email marketing                |
| MARKETING_PUSH        | All       | Push notifications             |
| MARKETING_PUSH_NIGHT  | KR        | Night push (21:00-08:00, PIPA) |
| CROSS_BORDER_TRANSFER | JP        | Data transfer (APPI)           |
| CROSS_SERVICE_SHARING | UNIFIED   | Cross-service sharing          |

## API

### Get Requirements

```
GET /v1/services/resume/consent-requirements?countryCode=KR
```

### Join with Consents

```
POST /v1/services/resume/join
{
  "countryCode": "KR",
  "consents": [
    {"type": "TERMS_OF_SERVICE", "agreed": true, "documentId": "doc-tos-kr"},
    {"type": "PRIVACY_POLICY", "agreed": true, "documentId": "doc-pp-kr"},
    {"type": "MARKETING_EMAIL", "agreed": true}
  ]
}
```

### Update Consent

```
PUT /v1/services/resume/consent
{"consentType": "MARKETING_EMAIL", "countryCode": "KR", "agreed": false}
```

### View All

```
GET /v1/legal/consents
```

## Country Rules

| Country | Regulation | Rules                            |
| ------- | ---------- | -------------------------------- |
| KR      | PIPA       | Age 14+, night push consent      |
| EU      | GDPR       | Age 16+, 365d retention, erasure |
| JP      | APPI       | Cross-border consent             |
| US/CA   | CCPA       | Age 13+, "Do Not Sell"           |

## Guard Usage

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaFeature() {}
```

## Audit

```
GET /v1/admin/legal/consents/stats?range=30d
```

Logged: timestamp, IP, user agent, document version

## Errors

| Code | Error                    | Cause                    |
| ---- | ------------------------ | ------------------------ |
| 400  | Required consent missing | TERMS/PRIVACY not agreed |
| 400  | Invalid country code     | Not 2-letter ISO         |
| 409  | Consent already exists   | Use UPDATE               |
