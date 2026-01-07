# Global Account

## Account Modes

| Mode    | Description              | Token                 |
| ------- | ------------------------ | --------------------- |
| SERVICE | Independent per service  | Single service access |
| UNIFIED | Integrated multi-service | All linked services   |

## Registration Flow

```
1. User signup -> 2. Check email exists -> 3. Select country -> 4. Consent form (Law Registry) -> 5. Submit -> 6. Create UserService -> 7. Issue token
```

## Law Registry

| Code | Country | Min Age | Key                  |
| ---- | ------- | ------- | -------------------- |
| PIPA | KR      | 14      | Night push consent   |
| GDPR | EU      | 16      | 365d retention       |
| APPI | JP      | -       | Cross-border consent |
| CCPA | US      | 13      | Third-party opt-out  |

## Consents

### Required

- TERMS_OF_SERVICE
- PRIVACY_POLICY

### Optional (Country-Specific)

```yaml
all: [MARKETING_EMAIL, MARKETING_PUSH, MARKETING_SMS, PERSONALIZED_ADS, THIRD_PARTY_SHARING]
KR: [MARKETING_PUSH_NIGHT]
JP: [CROSS_BORDER_TRANSFER]
UNIFIED: [CROSS_SERVICE_SHARING]
```

## Token Payloads

### User

```json
{
  "sub": "uuid",
  "type": "USER_ACCESS",
  "accountMode": "SERVICE",
  "countryCode": "KR",
  "services": { "resume": { "status": "ACTIVE", "countries": ["KR"] } }
}
```

### Admin

```json
{
  "sub": "uuid",
  "type": "ADMIN_ACCESS",
  "scope": "SYSTEM",
  "roleName": "system_super",
  "level": 100,
  "permissions": ["*"]
}
```

### Operator

```json
{
  "sub": "uuid",
  "type": "OPERATOR_ACCESS",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read"]
}
```

## Account Linking

### Prerequisites

- Same email
- Both SERVICE mode
- No existing link

### Flow

```
1. Request link -> 2. PENDING -> 3. Accept with password -> 4. Platform consents -> 5. Both -> UNIFIED -> 6. New unified token
```

## Guards

```typescript
@UseGuards(UnifiedAuthGuard, ServiceAccessGuard)
@RequireService('resume')
async getResume() {}

@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaData() {}

@UseGuards(UnifiedAuthGuard, AccountTypeGuard)
@RequireAccountType('ADMIN')
async adminOnly() {}
```

## Operator System

| Type   | Password   |
| ------ | ---------- |
| EMAIL  | User sets  |
| DIRECT | Admin sets |

Scope: assigned service + country + permissions only

## Tables

| Table             | Purpose                  |
| ----------------- | ------------------------ |
| users             | accountMode              |
| services          | Definitions              |
| user_services     | User x Service x Country |
| user_consents     | Per-service consents     |
| law_registry      | Country requirements     |
| account_links     | SERVICE -> UNIFIED       |
| operators         | Service operators        |
| platform_consents | Cross-service            |

## Relationships

```
User 1:N UserService N:1 Service
User 1:N UserConsent
User 1:1 PersonalInfo
User 1:N AccountLink
Service 1:N Operator
Admin 1:N Operator
```
