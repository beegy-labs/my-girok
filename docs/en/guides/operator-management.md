# Operator Management Guide

> Managing service operators with scoped access and permissions

## Overview

Operators are service-specific users who can manage content and users within their assigned service and country. Unlike admins, operators have limited scope and cannot access admin-level features.

## Creating Operators

### Direct Creation

Create an operator with admin-set credentials:

```
POST /v1/admin/operators
{
  "email": "operator@company.com",
  "name": "John Smith",
  "password": "SecureP@ss123",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "DIRECT"
}
```

### Email Invitation

Send an invitation email for the operator to set their own password:

```
POST /v1/admin/operators/invite
{
  "email": "operator@company.com",
  "name": "John Smith",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "EMAIL"
}
```

The operator receives a link to complete registration and set their password.

## Operator Authentication

Operators log in through a dedicated endpoint:

```
POST /v1/operator/auth/login
{
  "email": "operator@company.com",
  "password": "SecureP@ss123",
  "serviceSlug": "resume"
}
```

## CRUD Operations

| Operation | Endpoint                                     | Description                  |
| --------- | -------------------------------------------- | ---------------------------- |
| List      | `GET /v1/admin/operators?serviceSlug=resume` | List operators for a service |
| Get       | `GET /v1/admin/operators/{id}`               | Get operator details         |
| Update    | `PATCH /v1/admin/operators/{id}`             | Update operator info         |
| Delete    | `DELETE /v1/admin/operators/{id}`            | Soft delete operator         |

## Permission Management

### Granting Permissions

```
POST /v1/admin/operators/{id}/permissions
{
  "permissions": ["user:read", "resume:read", "resume:update"]
}
```

### Available Permissions

| Permission         | Description                     |
| ------------------ | ------------------------------- |
| user:read          | View user profiles within scope |
| resume:read        | View resume content             |
| resume:update      | Edit resume content             |
| personal_info:read | View personal information       |
| consent:read       | View user consent status        |

## Access Control

### What Operators CAN Do

- View users within their assigned service and country
- Perform actions allowed by their granted permissions
- Access operator-specific dashboard

### What Operators CANNOT Do

- Access other services outside their scope
- Manage other operators
- Access admin-level APIs
- View users from other countries

## Token Structure

Operator tokens contain scoped claims:

```json
{
  "sub": "operator-uuid",
  "type": "OPERATOR_ACCESS",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "resume:read"]
}
```

## Error Handling

| Error             | Cause                              | Solution                                       |
| ----------------- | ---------------------------------- | ---------------------------------------------- |
| Invalid service   | Service slug not found             | Verify service exists via `GET /v1/services`   |
| Permission denied | Operator lacks required permission | Admin grants permission via API                |
| Inactive operator | Operator account is disabled       | Reactivate via `PATCH {id} {"isActive": true}` |

## Best Practices

1. **Principle of Least Privilege**: Grant only necessary permissions
2. **Regular Audits**: Review operator access periodically
3. **Use Email Invites**: Prefer email invitations over direct password setting
4. **Document Access**: Keep records of why operators need specific permissions
5. **Prompt Deactivation**: Disable operators immediately when access is no longer needed

---

**LLM Reference**: `docs/llm/guides/OPERATOR_MANAGEMENT.md`
