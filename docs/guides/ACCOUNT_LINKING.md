# Account Linking Guide

> Link SERVICE mode accounts into a single UNIFIED account

## Overview

Account linking allows users with multiple SERVICE mode accounts (one per service) to combine them into a single UNIFIED account with cross-service access.

## Prerequisites

- User has at least two accounts with the same email
- Both accounts are in SERVICE mode
- No existing link between the accounts

## Linking Flow

```
┌─────────────────┐     ┌─────────────────┐
│ Account A       │     │ Account B       │
│ (Resume Service)│     │ (Feed Service)  │
│ SERVICE mode    │     │ SERVICE mode    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │   1. Request Link     │
         ├───────────────────────►
         │                       │
         │   2. Accept + Password│
         ◄───────────────────────┤
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│              UNIFIED Account             │
│  - Access to Resume Service             │
│  - Access to Feed Service               │
│  - Single token for all services        │
└─────────────────────────────────────────┘
```

## Step-by-Step Guide

### Step 1: Find Linkable Accounts

The primary user checks for accounts that can be linked.

```bash
GET /v1/users/me/linkable-accounts
Authorization: Bearer <user-token>
```

**Response:**

```json
[
  {
    "id": "account-b-uuid",
    "email": "j***n@example.com",
    "services": [
      {
        "slug": "feed",
        "name": "Feed Service",
        "joinedAt": "2024-01-10T08:00:00Z"
      }
    ],
    "createdAt": "2024-01-10T08:00:00Z"
  }
]
```

### Step 2: Request Link

Primary user initiates the link request.

```bash
POST /v1/users/me/link-account
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "linkedUserId": "account-b-uuid"
}
```

**Response:**

```json
{
  "id": "link-uuid",
  "primaryUserId": "account-a-uuid",
  "linkedUserId": "account-b-uuid",
  "linkedServiceId": "feed-service-uuid",
  "status": "PENDING",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Step 3: Accept Link

The linked user accepts with password verification and platform consents.

```bash
POST /v1/users/me/accept-link
Authorization: Bearer <linked-user-token>
Content-Type: application/json

{
  "linkId": "link-uuid",
  "password": "MyPassword123",
  "platformConsents": [
    {
      "type": "CROSS_SERVICE_SHARING",
      "countryCode": "KR",
      "agreed": true
    },
    {
      "type": "PRIVACY_POLICY",
      "countryCode": "KR",
      "agreed": true,
      "documentId": "doc-uuid"
    }
  ]
}
```

**Response:**

```json
{
  "linkedAt": "2024-01-15T10:05:00Z",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Step 4: Use Unified Token

The new token contains all linked services.

```json
{
  "sub": "account-a-uuid",
  "email": "john@example.com",
  "type": "USER_ACCESS",
  "accountMode": "UNIFIED",
  "countryCode": "KR",
  "services": {
    "resume": {
      "status": "ACTIVE",
      "countries": ["KR"]
    },
    "feed": {
      "status": "ACTIVE",
      "countries": ["KR"]
    }
  }
}
```

## Viewing Linked Accounts

```bash
GET /v1/users/me/linked-accounts
Authorization: Bearer <user-token>
```

**Response:**

```json
[
  {
    "id": "link-uuid",
    "linkedUser": {
      "id": "account-b-uuid",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "service": {
      "id": "feed-service-uuid",
      "slug": "feed",
      "name": "Feed Service"
    },
    "linkedAt": "2024-01-15T10:05:00Z"
  }
]
```

## Unlinking Accounts

Either user can unlink their account.

```bash
DELETE /v1/users/me/linked-accounts/{linkId}
Authorization: Bearer <user-token>
```

**What Happens:**

1. Link status changes to UNLINKED
2. If no other links remain, account reverts to SERVICE mode
3. User loses cross-service access
4. Personal info and consents remain intact

## Platform Consents

When accepting a link, the user must provide platform-level consents:

| Consent Type          | Required    | Description                                |
| --------------------- | ----------- | ------------------------------------------ |
| CROSS_SERVICE_SHARING | Yes         | Allow data sharing between services        |
| PRIVACY_POLICY        | Recommended | Updated privacy policy for unified account |
| TERMS_OF_SERVICE      | Recommended | Updated terms for unified account          |

## Error Handling

### "Link already exists" (409 Conflict)

Accounts are already linked or have a pending request.

### "Both accounts are already UNIFIED" (400 Bad Request)

Cannot link two UNIFIED accounts. Unlink one first.

### "Invalid password" (401 Unauthorized)

Password verification failed for the linked user.

### "User not found" (404 Not Found)

The linkedUserId doesn't exist.

## Security Considerations

1. **Password Verification**: Linked user must prove ownership with password
2. **Email Matching**: Only accounts with identical emails can be linked
3. **Consent Required**: Platform consent is mandatory for data sharing
4. **Audit Trail**: All link operations are logged

## FAQ

**Q: Can I link more than two accounts?**
A: Yes, you can link multiple accounts to a primary account.

**Q: What happens to my data after linking?**
A: Data remains in original service databases but becomes accessible via unified token.

**Q: Can I unlink and re-link later?**
A: Yes, you can unlink at any time and create a new link request later.

**Q: Do I lose my service-specific consents?**
A: No, service consents remain intact. Platform consents are added.

---

**Related:**

- [Global Account Policy](../policies/GLOBAL_ACCOUNT.md)
- [Consent Flow](./CONSENT_FLOW.md)
