# Account Linking Guide

> Link SERVICE mode accounts into UNIFIED account

## Prerequisites

- Two accounts with same email
- Both accounts in SERVICE mode
- No existing link between them

## Flow Overview

```
Account A (Resume) + Account B (Feed) → UNIFIED Account (Both Services)
```

## Step-by-Step

### 1. Find Linkable Accounts

```bash
GET /v1/users/me/linkable-accounts
# Returns accounts with matching email
```

### 2. Request Link

```bash
POST /v1/users/me/link-account
{ "linkedUserId": "account-b-uuid" }
# Creates PENDING link
```

### 3. Accept Link

```bash
POST /v1/users/me/accept-link
Authorization: Bearer <linked-user-token>

{
  "linkId": "link-uuid",
  "password": "MyPassword123",
  "platformConsents": [
    { "type": "CROSS_SERVICE_SHARING", "countryCode": "KR", "agreed": true }
  ]
}
```

Returns new unified token with all linked services.

## Unified Token

```json
{
  "sub": "account-a-uuid",
  "type": "USER_ACCESS",
  "accountMode": "UNIFIED",
  "services": {
    "resume": { "status": "ACTIVE", "countries": ["KR"] },
    "feed": { "status": "ACTIVE", "countries": ["KR"] }
  }
}
```

## Manage Links

| Action      | Endpoint                                       |
| ----------- | ---------------------------------------------- |
| View linked | `GET /v1/users/me/linked-accounts`             |
| Unlink      | `DELETE /v1/users/me/linked-accounts/{linkId}` |

## Platform Consents Required

| Type                  | Required    | Description                   |
| --------------------- | ----------- | ----------------------------- |
| CROSS_SERVICE_SHARING | Yes         | Data sharing between services |
| PRIVACY_POLICY        | Recommended | Updated privacy terms         |

## Unlink Behavior

- Link status → UNLINKED
- If no other links → reverts to SERVICE mode
- Personal info and consents remain intact

## Common Errors

| Error                      | Cause                            |
| -------------------------- | -------------------------------- |
| 409 "Link already exists"  | Accounts already linked          |
| 400 "Both already UNIFIED" | Cannot link two UNIFIED accounts |
| 401 "Invalid password"     | Password verification failed     |

## Security

- Password verification required
- Only same-email accounts can link
- All operations are audited

---

**Related**: [Global Account Policy](../policies/GLOBAL_ACCOUNT.md)
