# Operator Management

## Create Operator

### Direct

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

### Email Invite

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

## Login

```
POST /v1/operator/auth/login
{"email": "operator@company.com", "password": "SecureP@ss123", "serviceSlug": "resume"}
```

## CRUD

| Operation | Endpoint                                     |
| --------- | -------------------------------------------- |
| List      | `GET /v1/admin/operators?serviceSlug=resume` |
| Get       | `GET /v1/admin/operators/{id}`               |
| Update    | `PATCH /v1/admin/operators/{id}`             |
| Delete    | `DELETE /v1/admin/operators/{id}` (soft)     |

## Permissions

### Grant

```
POST /v1/admin/operators/{id}/permissions
{"permissions": ["user:read", "resume:read", "resume:update"]}
```

### Available

| Permission         | Description         |
| ------------------ | ------------------- |
| user:read          | View user profiles  |
| resume:read        | View resumes        |
| resume:update      | Edit resumes        |
| personal_info:read | View personal info  |
| consent:read       | View consent status |

## Access Control

| CAN                           | CANNOT                |
| ----------------------------- | --------------------- |
| View users in service/country | Access other services |
| Perform permitted actions     | Manage operators      |
| -                             | Access admin APIs     |

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

## Errors

| Error             | Cause              | Solution                        |
| ----------------- | ------------------ | ------------------------------- |
| Invalid service   | Service not found  | Check `GET /v1/services`        |
| Permission denied | Missing permission | Grant via admin API             |
| Inactive operator | Account disabled   | `PATCH {id} {"isActive": true}` |
