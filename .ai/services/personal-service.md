# Personal Service

> Resume management with PostgreSQL + MinIO + BullMQ | **Last Updated**: 2026-01-06

## Service Info

| Property | Value                        |
| -------- | ---------------------------- |
| REST     | :3002                        |
| gRPC     | N/A                          |
| Database | personal_db (PostgreSQL)     |
| Cache    | Valkey DB 1                  |
| Storage  | MinIO (S3-compatible)        |
| Events   | N/A                          |
| Codebase | `services/personal-service/` |

## Domain Boundaries

| This Service     | NOT This Service              |
| ---------------- | ----------------------------- |
| Resume CRUD      | Accounts, Sessions (identity) |
| User Preferences | Roles, Permissions (auth)     |
| File Attachments | Consents, Documents (legal)   |
| Public Sharing   | Analytics, Audit logging      |

## REST API

```
POST/GET/PUT/DELETE  /resume, /resume/:id
PATCH  /resume/:id/default
POST   /resume/:id/copy
PATCH  /resume/:id/sections/order|visibility
POST   /resume/:id/attachments
DELETE /resume/:id/attachments/:aid

GET   /resume/public/:username       # No auth
GET   /share/public/:token           # No auth
POST  /share/resume/:resumeId        # Auth required

GET/POST/DELETE  /v1/user-preferences
```

## gRPC Server

N/A - REST only

## Database Tables

| Table            | Purpose           |
| ---------------- | ----------------- |
| resumes          | Resume metadata   |
| sections         | Resume sections   |
| experiences      | Work history      |
| educations       | Education history |
| skills           | Skill entries     |
| attachments      | File references   |
| user_preferences | User settings     |

## Events

N/A

## Caching

| Key Pattern                     | TTL |
| ------------------------------- | --- |
| `personal:user_id:{username}`   | 2h  |
| `personal:preferences:{userId}` | 1h  |

## Environment

```bash
PORT=3002
DATABASE_URL=postgresql://...personal_db
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=my-girok-resumes
VALKEY_HOST=localhost
VALKEY_DB=1
```

---

**Full docs**: `docs/services/PERSONAL_SERVICE.md`
