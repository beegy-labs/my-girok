# Global Account System Policy

> Multi-service account management with country-specific consent

## Overview

The Global Account System enables users to access multiple services with flexible account modes and country-specific legal compliance.

## Account Modes

### SERVICE Mode (Default)

- **Description**: Independent account per service
- **Use Case**: User registers for a single service in one country
- **Token Contains**: Single service access, single country consent
- **Transition**: Can upgrade to UNIFIED by linking accounts

### UNIFIED Mode

- **Description**: Integrated account across multiple services
- **Use Case**: User wants single login for all services
- **Token Contains**: All linked services, all country consents
- **Transition**: Requires account linking process

## Service Registration Flow

```
1. User discovers service (e.g., resume.girok.dev)
2. Clicks "Sign Up" or "Get Started"
3. System checks existing account by email
   ├─ No account → New registration
   └─ Existing account → Login prompt
4. Select country (for consent requirements)
5. Display consent form based on:
   ├─ Law Registry (PIPA, GDPR, APPI, CCPA)
   └─ Service-specific requirements
6. Submit consents
7. Create UserService record
8. Issue token with service access
```

## Law Registry

### Supported Regulations

| Code | Country | Full Name                          | Key Requirements                          |
| ---- | ------- | ---------------------------------- | ----------------------------------------- |
| PIPA | KR      | 개인정보보호법                     | Night push consent (21:00-08:00), Age 14+ |
| GDPR | EU      | General Data Protection Regulation | Data retention 365d, Age 16+              |
| APPI | JP      | 個人情報保護法                     | Cross-border transfer consent             |
| CCPA | US      | California Consumer Privacy Act    | Age 13+, Third-party sharing opt-out      |

### Required vs Optional Consents

**Always Required:**

- TERMS_OF_SERVICE
- PRIVACY_POLICY

**Country-Specific Optional:**

- MARKETING_EMAIL
- MARKETING_PUSH
- MARKETING_PUSH_NIGHT (KR only)
- MARKETING_SMS
- PERSONALIZED_ADS
- THIRD_PARTY_SHARING
- CROSS_BORDER_TRANSFER (JP)
- CROSS_SERVICE_SHARING (UNIFIED mode)

## Token Structure

### User Token (USER_ACCESS)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "type": "USER_ACCESS",
  "accountMode": "SERVICE",
  "countryCode": "KR",
  "services": {
    "resume": {
      "status": "ACTIVE",
      "countries": ["KR", "JP"]
    }
  }
}
```

### Admin Token (ADMIN_ACCESS)

```json
{
  "sub": "admin-uuid",
  "email": "admin@girok.dev",
  "name": "System Admin",
  "type": "ADMIN_ACCESS",
  "scope": "SYSTEM",
  "tenantId": null,
  "roleId": "role-uuid",
  "roleName": "system_super",
  "level": 100,
  "permissions": ["*"]
}
```

### Operator Token (OPERATOR_ACCESS)

```json
{
  "sub": "operator-uuid",
  "email": "operator@company.com",
  "name": "Company Operator",
  "type": "OPERATOR_ACCESS",
  "adminId": "admin-uuid",
  "serviceId": "service-uuid",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "resume:read"]
}
```

## Account Linking

### Prerequisites

- Both accounts have same email
- Both accounts are in SERVICE mode
- No existing link between accounts

### Linking Flow

```
1. Primary user requests link (POST /v1/users/me/link-account)
2. System creates PENDING link
3. Linked user receives notification
4. Linked user accepts with password verification (POST /v1/users/me/accept-link)
5. Platform consents collected for linked user
6. Both accounts transition to UNIFIED mode
7. New unified token issued with all services
```

### Unlinking

- Either user can unlink (DELETE /v1/users/me/linked-accounts/:id)
- If no other links remain, account reverts to SERVICE mode
- Consents and data remain intact

## Operator System

### Roles

- **Admin**: Creates and manages operators for their tenant
- **Operator**: Service-specific access with limited permissions

### Invitation Types

| Type   | Description            | Password            |
| ------ | ---------------------- | ------------------- |
| EMAIL  | Send invitation email  | User sets password  |
| DIRECT | Admin creates directly | Admin sets password |

### Permission Scope

Operators can only access:

- Users within their assigned service
- Data within their assigned country
- Actions allowed by their permissions

## Guards and Decorators

### UnifiedAuthGuard

Routes authentication based on token type:

- USER_ACCESS → validateUser()
- ADMIN_ACCESS → validateAdmin()
- OPERATOR_ACCESS → validateOperator()

### ServiceAccessGuard

```typescript
@UseGuards(UnifiedAuthGuard, ServiceAccessGuard)
@RequireService('resume')
async getResume() { }
```

### CountryConsentGuard

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaData() { }
```

### AccountTypeGuard

```typescript
@UseGuards(UnifiedAuthGuard, AccountTypeGuard)
@RequireAccountType('ADMIN')
async adminOnly() { }
```

## Database Schema

### Core Tables

| Table             | Description                              |
| ----------------- | ---------------------------------------- |
| users             | User accounts with accountMode           |
| services          | Service definitions (resume, feed, etc.) |
| user_services     | User × Service × Country junction        |
| user_consents     | Per-service, per-country consents        |
| law_registry      | Legal requirements by country            |
| account_links     | SERVICE → UNIFIED linking                |
| operators         | Service operators                        |
| personal_info     | Shared personal information              |
| platform_consents | Cross-service consents                   |

### Key Relationships

```
User 1:N UserService N:1 Service
User 1:N UserConsent
User 1:1 PersonalInfo
User 1:N AccountLink (as primary or linked)
Service 1:N Operator
Admin 1:N Operator
```

## Migration Guide

### From Legacy Single-Service

1. Set accountMode = 'SERVICE' for all existing users
2. Create UserService records for existing service memberships
3. Copy existing consents to new country-aware format
4. Update JWT generation to use new payload structure
5. Deploy new guards (backward compatible)

### Token Backward Compatibility

Legacy tokens (without `type` field) are handled by `isLegacyPayload()` check and validated as USER with default SERVICE mode.

---

**LLM Reference**: `.ai/services/auth-service.md`
**Related Guides**:

- [Operator Management](../guides/OPERATOR_MANAGEMENT.md)
- [Account Linking](../guides/ACCOUNT_LINKING.md)
- [Consent Flow](../guides/CONSENT_FLOW.md)
