# Consent Flow Guide

> Managing user consents across countries with GDPR, PIPA, and CCPA compliance

## Consent Types

### Required Consents (All Countries)

These consents are mandatory and users cannot proceed without agreeing:

| Type             | Purpose                                     |
| ---------------- | ------------------------------------------- |
| TERMS_OF_SERVICE | Agreement to service terms and conditions   |
| PRIVACY_POLICY   | Acknowledgment of data processing practices |

### Optional Consents

Users can choose to opt-in or opt-out of these consents:

| Type                  | Countries    | Purpose                                         |
| --------------------- | ------------ | ----------------------------------------------- |
| MARKETING_EMAIL       | All          | Receive promotional emails                      |
| MARKETING_PUSH        | All          | Receive push notifications                      |
| MARKETING_PUSH_NIGHT  | KR only      | Night-time push (21:00-08:00, PIPA requirement) |
| CROSS_BORDER_TRANSFER | JP only      | Data transfer outside Japan (APPI requirement)  |
| CROSS_SERVICE_SHARING | UNIFIED mode | Share data between linked services              |

## Country-Specific Rules

| Country            | Regulation | Key Rules                                                    |
| ------------------ | ---------- | ------------------------------------------------------------ |
| KR (Korea)         | PIPA       | Minimum age 14+, night push consent required                 |
| EU (Europe)        | GDPR       | Minimum age 16+, 365-day consent retention, right to erasure |
| JP (Japan)         | APPI       | Cross-border transfer consent required                       |
| US/CA (California) | CCPA       | Minimum age 13+, "Do Not Sell" option required               |

## API Endpoints

### Get Consent Requirements

Retrieve the required consents for a specific service and country:

```
GET /v1/services/resume/consent-requirements?countryCode=KR
```

Returns the list of required and optional consents based on country regulations.

### Join Service with Consents

Register for a service while providing consent agreements:

```
POST /v1/services/resume/join
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
    }
  ]
}
```

### Update Individual Consent

Modify a specific consent preference:

```
PUT /v1/services/resume/consent
{
  "consentType": "MARKETING_EMAIL",
  "countryCode": "KR",
  "agreed": false
}
```

### View All Consents

Retrieve all consent records for the current user:

```
GET /v1/legal/consents
```

## Guard Implementation

### CountryConsentGuard

Protect endpoints that require specific country consents:

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaFeature() {
  // Only accessible to users with Korean consents
}
```

## Audit Trail

All consent changes are logged with:

- Timestamp (ISO 8601)
- IP address
- User agent
- Document version

Query consent statistics:

```
GET /v1/admin/legal/consents/stats?range=30d
```

## Error Handling

| HTTP Code | Error                    | Cause                                         |
| --------- | ------------------------ | --------------------------------------------- |
| 400       | Required consent missing | TERMS_OF_SERVICE or PRIVACY_POLICY not agreed |
| 400       | Invalid country code     | Not a valid 2-letter ISO country code         |
| 409       | Consent already exists   | Use UPDATE endpoint instead of CREATE         |

## Implementation Flow

```
1. User initiates registration
2. Frontend calls GET /consent-requirements
3. Display consent form with required/optional items
4. User reviews and agrees to consents
5. Frontend calls POST /join with consents
6. Backend validates all required consents present
7. Backend creates consent records with audit trail
8. User gains access to service
```

## Best Practices

1. **Clear Language**: Use plain language in consent descriptions
2. **Granular Control**: Allow users to manage each consent individually
3. **Easy Withdrawal**: Make it simple to withdraw optional consents
4. **Version Tracking**: Link consents to specific document versions
5. **Audit Everything**: Log all consent changes for compliance

---

**LLM Reference**: `docs/llm/guides/CONSENT_FLOW.md`
