# personal-service

```yaml
port: 4002
db: personal_db (PostgreSQL)
cache: Valkey DB 1
storage: MinIO (S3)
codebase: services/personal-service/
```

## Boundaries

| Owns             | Not                |
| ---------------- | ------------------ |
| Resume CRUD      | Accounts/Sessions  |
| User Preferences | Roles/Permissions  |
| File Attachments | Consents/Documents |
| Public Sharing   | Analytics/Audit    |

## REST

```
POST/GET/PUT/DELETE /resume[/:id]
PATCH /resume/:id/default
POST /resume/:id/copy
PATCH /resume/:id/sections/order|visibility
POST /resume/:id/attachments
DELETE /resume/:id/attachments/:aid

GET /resume/public/:username      # No auth
GET /share/public/:token          # No auth
POST /share/resume/:resumeId      # Auth

GET/POST/DELETE /v1/user-preferences
```

## Tables

| Table            | Purpose         |
| ---------------- | --------------- |
| resumes          | Resume metadata |
| sections         | Resume sections |
| experiences      | Work history    |
| educations       | Education       |
| skills           | Skill entries   |
| attachments      | File refs       |
| user_preferences | User settings   |

## Cache

| Key                             | TTL |
| ------------------------------- | --- |
| `personal:user_id:{username}`   | 2h  |
| `personal:preferences:{userId}` | 1h  |

## Env

```bash
PORT=4002
DATABASE_URL=postgresql://...personal_db
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=my-girok-resumes
VALKEY_HOST=localhost
VALKEY_DB=1
```

---

Full: `docs/en/services/PERSONAL_SERVICE.md`
