# Operator Management Guide

> Step-by-step guide for creating and managing service operators

## Overview

Operators are service-specific personnel who can access user data within their assigned service and country. They are created by Admins and have limited, scoped permissions.

## Prerequisites

- Admin account with operator management permissions
- Service must exist in the system
- Target country must be defined

## Creating an Operator

### Method 1: Direct Creation

Admin creates operator account directly with a password.

```bash
POST /v1/admin/operators
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "operator@company.com",
  "name": "John Smith",
  "password": "SecureP@ss123",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "DIRECT"
}
```

**Response:**

```json
{
  "id": "operator-uuid",
  "email": "operator@company.com",
  "name": "John Smith",
  "serviceId": "service-uuid",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Method 2: Email Invitation

Admin sends invitation email; operator sets own password.

```bash
POST /v1/admin/operators/invite
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "operator@company.com",
  "name": "John Smith",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "EMAIL"
}
```

**Response:**

```json
{
  "id": "operator-uuid",
  "email": "operator@company.com",
  "invitationToken": "inv_abc123...",
  "expiresAt": "2024-01-22T10:00:00Z"
}
```

## Operator Login

Operators log in with their service context.

```bash
POST /v1/operator/auth/login
Content-Type: application/json

{
  "email": "operator@company.com",
  "password": "SecureP@ss123",
  "serviceSlug": "resume"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "operator": {
    "id": "operator-uuid",
    "email": "operator@company.com",
    "name": "John Smith",
    "serviceSlug": "resume",
    "countryCode": "KR"
  }
}
```

## Managing Permissions

### Grant Permission

```bash
POST /v1/admin/operators/{operatorId}/permissions
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "permissions": [
    "user:read",
    "resume:read",
    "resume:update"
  ]
}
```

### Available Permissions

| Permission           | Description         |
| -------------------- | ------------------- |
| `user:read`          | View user profiles  |
| `user:update`        | Update user data    |
| `resume:read`        | View resumes        |
| `resume:update`      | Edit resumes        |
| `personal_info:read` | View personal info  |
| `consent:read`       | View consent status |

## Listing Operators

### All Operators (Admin View)

```bash
GET /v1/admin/operators?serviceSlug=resume&page=1&limit=20
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "data": [
    {
      "id": "operator-uuid",
      "email": "operator@company.com",
      "name": "John Smith",
      "serviceSlug": "resume",
      "countryCode": "KR",
      "isActive": true,
      "lastLoginAt": "2024-01-15T14:30:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

## Updating an Operator

```bash
PATCH /v1/admin/operators/{operatorId}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "John D. Smith",
  "countryCode": "JP",
  "isActive": false
}
```

## Deleting an Operator

```bash
DELETE /v1/admin/operators/{operatorId}
Authorization: Bearer <admin-token>
```

**Note:** This is a soft delete. Operator record is retained for audit purposes.

## Operator Token Structure

```json
{
  "sub": "operator-uuid",
  "email": "operator@company.com",
  "name": "John Smith",
  "type": "OPERATOR_ACCESS",
  "adminId": "admin-uuid",
  "serviceId": "service-uuid",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "resume:read"]
}
```

## Access Control

### What Operators CAN Do

- View users within their service
- Access data for their assigned country
- Perform actions allowed by their permissions
- View their own operator profile

### What Operators CANNOT Do

- Access other services
- View data from other countries
- Manage other operators
- Access admin-level APIs
- Modify their own permissions

## Best Practices

1. **Least Privilege**: Grant only necessary permissions
2. **Country Scoping**: Always assign specific country codes
3. **Regular Audit**: Review operator access logs
4. **Password Policy**: Enforce strong passwords for DIRECT creation
5. **Invitation Expiry**: Set reasonable expiration for EMAIL invites

## Troubleshooting

### "Invalid service" Error

The serviceSlug doesn't exist. Check available services:

```bash
GET /v1/services
```

### "Permission denied" Error

Operator lacks required permission. Check current permissions:

```bash
GET /v1/admin/operators/{operatorId}
```

### "Inactive operator" Error

Operator account is disabled. Re-enable:

```bash
PATCH /v1/admin/operators/{operatorId}
{ "isActive": true }
```

---

**Related:**

- [Global Account Policy](../policies/GLOBAL_ACCOUNT.md)
- [Consent Flow](./CONSENT_FLOW.md)
