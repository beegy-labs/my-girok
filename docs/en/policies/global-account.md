# Global Account Policy

> Multi-service account management with unified and service-specific modes

## Account Modes

| Mode    | Description              | Token Scope           |
| ------- | ------------------------ | --------------------- |
| SERVICE | Independent per service  | Single service access |
| UNIFIED | Integrated multi-service | All linked services   |

## Registration Flow

```
1. User signup
2. Check if email exists
3. Select country
4. Display consent form (based on Law Registry)
5. User submits consents
6. Create UserService record
7. Issue access token
```

## Law Registry by Country

| Code | Country | Min Age | Key Requirement                  |
| ---- | ------- | ------- | -------------------------------- |
| PIPA | KR      | 14      | Night push consent (21:00-08:00) |
| GDPR | EU      | 16      | 365-day consent retention        |
| APPI | JP      | -       | Cross-border transfer consent    |
| CCPA | US      | 13      | Third-party opt-out option       |

## Consent Requirements

### Required Consents (All Countries)

- TERMS_OF_SERVICE
- PRIVACY_POLICY

### Optional Consents

```yaml
all_countries:
  - MARKETING_EMAIL
  - MARKETING_PUSH
  - MARKETING_SMS
  - PERSONALIZED_ADS
  - THIRD_PARTY_SHARING

country_specific:
  KR:
    - MARKETING_PUSH_NIGHT
  JP:
    - CROSS_BORDER_TRANSFER

unified_mode_only:
  - CROSS_SERVICE_SHARING
```

## Token Payloads

### User Token

```json
{
  "sub": "01935c6d-c2d0-7abc-8def-1234567890ab",
  "type": "USER_ACCESS",
  "accountMode": "SERVICE",
  "countryCode": "KR",
  "services": {
    "resume": {
      "status": "ACTIVE",
      "countries": ["KR"]
    }
  }
}
```

### Admin Token

```json
{
  "sub": "01935c6d-c2d0-7abc-8def-1234567890ab",
  "type": "ADMIN_ACCESS",
  "scope": "SYSTEM",
  "roleName": "system_super",
  "level": 100,
  "permissions": ["*"]
}
```

### Operator Token

```json
{
  "sub": "01935c6d-c2d0-7abc-8def-1234567890ab",
  "type": "OPERATOR_ACCESS",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "content:manage"]
}
```

## Account Linking

### Prerequisites

- Same email address on both accounts
- Both accounts in SERVICE mode
- No existing link between accounts

### Linking Flow

```
1. User requests link
2. Link status: PENDING
3. User accepts with password verification
4. User grants platform consents
5. Both accounts transition to UNIFIED mode
6. New unified token issued
```

## Guards Usage

### Service Access Guard

```typescript
@UseGuards(UnifiedAuthGuard, ServiceAccessGuard)
@RequireService('resume')
async getResume() {
  // Only users with resume service access
}
```

### Country Consent Guard

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaData() {
  // Only users with Korean consents
}
```

### Account Type Guard

```typescript
@UseGuards(UnifiedAuthGuard, AccountTypeGuard)
@RequireAccountType('ADMIN')
async adminOnly() {
  // Only admin users
}
```

## Operator System

| Invitation Type | Password Setting             |
| --------------- | ---------------------------- |
| EMAIL           | User sets password via link  |
| DIRECT          | Admin sets password directly |

**Scope**: Operators can only access their assigned service + country + permissions.

## Database Tables

| Table             | Purpose                           |
| ----------------- | --------------------------------- |
| users             | Account mode, basic info          |
| services          | Service definitions               |
| user_services     | User-Service-Country relationship |
| user_consents     | Per-service consent records       |
| law_registry      | Country-specific requirements     |
| account_links     | SERVICE → UNIFIED transitions     |
| operators         | Service operator accounts         |
| platform_consents | Cross-service consent records     |

## Entity Relationships

```
User 1:N UserService N:1 Service
User 1:N UserConsent
User 1:1 PersonalInfo
User 1:N AccountLink
Service 1:N Operator
Admin 1:N Operator
```

---

**LLM Reference**: `docs/llm/policies/GLOBAL_ACCOUNT.md`
