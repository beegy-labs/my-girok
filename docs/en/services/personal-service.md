# Personal Service

> Resume management with PostgreSQL, MinIO, and BullMQ

## Service Info

| Property | Value                        |
| -------- | ---------------------------- |
| REST     | :4002                        |
| gRPC     | N/A                          |
| Database | personal_db (PostgreSQL)     |
| Cache    | Valkey DB 1                  |
| Storage  | MinIO (S3-compatible)        |
| Events   | N/A                          |
| Codebase | `services/personal-service/` |

## Domain Boundaries

| This Service Owns | NOT This Service (Other Services)    |
| ----------------- | ------------------------------------ |
| Resume CRUD       | Accounts/Sessions (identity-service) |
| User Preferences  | Roles/Permissions (auth-service)     |
| File Attachments  | Consents/Documents (legal-service)   |
| Public Sharing    | Analytics/Audit (other services)     |

## REST API

### Resume Management

| Method | Endpoint              | Description           |
| ------ | --------------------- | --------------------- |
| POST   | `/resume`             | Create resume         |
| GET    | `/resume`             | List user's resumes   |
| GET    | `/resume/:id`         | Get resume by ID      |
| PUT    | `/resume/:id`         | Update resume         |
| DELETE | `/resume/:id`         | Delete resume         |
| PATCH  | `/resume/:id/default` | Set as default resume |
| POST   | `/resume/:id/copy`    | Duplicate resume      |

### Resume Sections

| Method | Endpoint                          | Description               |
| ------ | --------------------------------- | ------------------------- |
| PATCH  | `/resume/:id/sections/order`      | Reorder sections          |
| PATCH  | `/resume/:id/sections/visibility` | Toggle section visibility |

### Attachments

| Method | Endpoint                       | Description       |
| ------ | ------------------------------ | ----------------- |
| POST   | `/resume/:id/attachments`      | Upload attachment |
| DELETE | `/resume/:id/attachments/:aid` | Delete attachment |

### Public Access (No Auth Required)

| Method | Endpoint                   | Description                   |
| ------ | -------------------------- | ----------------------------- |
| GET    | `/resume/public/:username` | Get public resume by username |
| GET    | `/share/public/:token`     | Get resume by share token     |

### Sharing (Auth Required)

| Method | Endpoint                  | Description       |
| ------ | ------------------------- | ----------------- |
| POST   | `/share/resume/:resumeId` | Create share link |

### User Preferences

| Method | Endpoint               | Description               |
| ------ | ---------------------- | ------------------------- |
| GET    | `/v1/user-preferences` | Get user preferences      |
| POST   | `/v1/user-preferences` | Create/update preferences |
| DELETE | `/v1/user-preferences` | Delete preferences        |

## Database Tables

| Table            | Purpose                      |
| ---------------- | ---------------------------- |
| resumes          | Resume metadata and settings |
| sections         | Resume section definitions   |
| experiences      | Work experience entries      |
| educations       | Education history            |
| skills           | Skill entries                |
| attachments      | File attachment references   |
| user_preferences | User preference settings     |

## Cache Keys (Valkey)

| Key Pattern                     | TTL | Description            |
| ------------------------------- | --- | ---------------------- |
| `personal:user_id:{username}`   | 2h  | User ID lookup cache   |
| `personal:preferences:{userId}` | 1h  | User preferences cache |

## Environment Variables

```bash
# REST API port
PORT=4002

# PostgreSQL database
DATABASE_URL=postgresql://user:password@host:5432/personal_db

# MinIO (S3-compatible) storage
MINIO_ENDPOINT=minio:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=my-girok-resumes
MINIO_PUBLIC_URL=http://localhost:9000

# Valkey cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=1
VALKEY_PREFIX=local:

# JWT for authentication
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Auth service URL
AUTH_SERVICE_URL=http://localhost:4001
```

---

**LLM Reference**: `docs/llm/services/personal-service.md`
