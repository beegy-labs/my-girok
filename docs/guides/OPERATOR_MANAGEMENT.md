# Operator Management Guide

> Service-specific personnel with scoped access

## Quick Start

### Create Operator (Direct)

```bash
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

### Create Operator (Email Invite)

```bash
POST /v1/admin/operators/invite
{
  "email": "operator@company.com",
  "name": "John Smith",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "EMAIL"
}
```

## Operator Login

```bash
POST /v1/operator/auth/login
{
  "email": "operator@company.com",
  "password": "SecureP@ss123",
  "serviceSlug": "resume"
}
```

## Permission Management

### Grant Permissions

```bash
POST /v1/admin/operators/{id}/permissions
{ "permissions": ["user:read", "resume:read", "resume:update"] }
```

### Available Permissions

| Permission           | Description         |
| -------------------- | ------------------- |
| `user:read`          | View user profiles  |
| `resume:read`        | View resumes        |
| `resume:update`      | Edit resumes        |
| `personal_info:read` | View personal info  |
| `consent:read`       | View consent status |

## CRUD Operations

| Operation | Endpoint                                        |
| --------- | ----------------------------------------------- |
| List      | `GET /v1/admin/operators?serviceSlug=resume`    |
| Get       | `GET /v1/admin/operators/{id}`                  |
| Update    | `PATCH /v1/admin/operators/{id}`                |
| Delete    | `DELETE /v1/admin/operators/{id}` (soft delete) |

## Access Control

**CAN**: View users in their service/country, perform permitted actions

**CANNOT**: Access other services, manage operators, access admin APIs

## Token Structure

```json
{
  "sub": "operator-uuid",
  "type": "OPERATOR_ACCESS",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "resume:read"]
}
```

## Common Errors

| Error               | Cause                 | Solution                          |
| ------------------- | --------------------- | --------------------------------- |
| "Invalid service"   | Service doesn't exist | Check `GET /v1/services`          |
| "Permission denied" | Missing permission    | Grant via admin API               |
| "Inactive operator" | Account disabled      | `PATCH {id} { "isActive": true }` |

---

**Related**: [Global Account Policy](../policies/GLOBAL_ACCOUNT.md)
