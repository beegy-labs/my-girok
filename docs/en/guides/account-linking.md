# Account Linking Guide

> Link multiple service accounts into a unified multi-service account

## Overview

Account linking allows users to connect separate SERVICE mode accounts into a single UNIFIED account, enabling seamless access across multiple services with one login.

## Prerequisites

Before accounts can be linked, all of the following conditions must be met:

| Requirement      | Description                                              |
| ---------------- | -------------------------------------------------------- |
| Same Email       | Both accounts must use the same email address            |
| SERVICE Mode     | Both accounts must be in SERVICE mode                    |
| No Existing Link | Neither account can already be linked to another account |

## Linking Flow

```
1. User A requests to link with User B
2. Link status set to PENDING
3. User B accepts with password verification
4. User B grants platform consents (CROSS_SERVICE_SHARING)
5. Both accounts transition to UNIFIED mode
6. New unified token issued with access to all services
```

## API Endpoints

### Find Linkable Accounts

Discover accounts that can be linked to the current user:

```
GET /v1/users/me/linkable-accounts
```

Returns accounts with matching email in SERVICE mode.

### Request Account Link

Initiate a link request to another account:

```
POST /v1/users/me/link-account
{
  "linkedUserId": "target-account-uuid"
}
```

### Accept Link Request

Accept a pending link request (requires password verification):

```
POST /v1/users/me/accept-link
{
  "linkId": "link-request-uuid",
  "password": "user-password",
  "platformConsents": [
    {
      "type": "CROSS_SERVICE_SHARING",
      "countryCode": "KR",
      "agreed": true
    }
  ]
}
```

### View Linked Accounts

List all accounts linked to the current user:

```
GET /v1/users/me/linked-accounts
```

### Unlink Account

Remove a link between accounts:

```
DELETE /v1/users/me/linked-accounts/{linkId}
```

## Required Consents

| Consent Type          | Required    | Description                                 |
| --------------------- | ----------- | ------------------------------------------- |
| CROSS_SERVICE_SHARING | Yes         | Allows data sharing between linked services |
| PRIVACY_POLICY        | Recommended | Platform-level privacy agreement            |

## Unified Token Structure

After successful linking, users receive a unified token:

```json
{
  "sub": "account-a-uuid",
  "type": "USER_ACCESS",
  "accountMode": "UNIFIED",
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

## Unlink Behavior

When accounts are unlinked:

- Link status changes to UNLINKED
- If no other links remain, account reverts to SERVICE mode
- Personal information and consents are preserved
- Service access is maintained for the original service

## Error Handling

| HTTP Code | Error                | Cause                                |
| --------- | -------------------- | ------------------------------------ |
| 409       | Link already exists  | Accounts are already linked          |
| 400       | Both already UNIFIED | Cannot link accounts in UNIFIED mode |
| 401       | Invalid password     | Password verification failed         |

## Security Considerations

- Password verification is always required for accepting links
- Only accounts with matching email addresses can be linked
- All linking operations are recorded in the audit log
- Link requests expire after a configurable period

---

**LLM Reference**: `docs/llm/guides/ACCOUNT_LINKING.md`
