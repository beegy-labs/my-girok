# Personal Service

> Resume management, file storage, and user preferences

## Quick Reference

| Item      | Value                      |
| --------- | -------------------------- |
| Port      | 3002                       |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | PostgreSQL 16 + Prisma 6   |
| Storage   | MinIO (S3-compatible)      |
| Queue     | BullMQ + Valkey            |

## API Endpoints

### Resume CRUD

| Method | Endpoint                       | Description   |
| ------ | ------------------------------ | ------------- |
| GET    | `/v1/resume`                   | List resumes  |
| GET    | `/v1/resume/:resumeId`         | Get resume    |
| POST   | `/v1/resume`                   | Create resume |
| PUT    | `/v1/resume/:resumeId`         | Update resume |
| DELETE | `/v1/resume/:resumeId`         | Delete resume |
| PATCH  | `/v1/resume/:resumeId/default` | Set default   |
| POST   | `/v1/resume/:resumeId/copy`    | Duplicate     |

### Sections & Attachments

| Method | Endpoint                             | Description       |
| ------ | ------------------------------------ | ----------------- |
| PATCH  | `/v1/resume/:id/sections/order`      | Reorder sections  |
| PATCH  | `/v1/resume/:id/sections/visibility` | Toggle visibility |
| POST   | `/v1/resume/:id/attachments`         | Upload file       |
| DELETE | `/v1/resume/:id/attachments/:id`     | Delete file       |

### Public & Sharing

| Method | Endpoint                      | Auth | Description       |
| ------ | ----------------------------- | ---- | ----------------- |
| GET    | `/v1/resume/public/:username` | No   | Public resume     |
| POST   | `/v1/share/resume/:resumeId`  | Yes  | Create share link |
| GET    | `/v1/share/public/:token`     | No   | Access shared     |

### User Preferences

| Method | Endpoint               | Description        |
| ------ | ---------------------- | ------------------ |
| GET    | `/v1/user-preferences` | Get preferences    |
| POST   | `/v1/user-preferences` | Upsert preferences |

## File Storage (MinIO)

```
my-girok-resumes/
├── resumes/{userId}/{resumeId}/{uuid}.{ext}  # Permanent
└── tmp/{userId}/{uuid}.{ext}                  # Temp (24h TTL)
```

| Constraint  | Value                |
| ----------- | -------------------- |
| Max Size    | 10 MB                |
| Image Types | JPEG, PNG, GIF, WEBP |
| Doc Types   | PDF, DOCX            |

## Enums

| Enum            | Values                                              |
| --------------- | --------------------------------------------------- |
| PaperSize       | A4, LETTER                                          |
| Gender          | MALE, FEMALE, OTHER                                 |
| MilitaryService | COMPLETED, EXEMPTED, NOT_APPLICABLE                 |
| SectionType     | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE |
| CopyStatus      | PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED    |

## Environment Variables

```bash
PORT=3002
DATABASE_URL=postgresql://user:pass@postgres:5432/personal_db
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=my-girok-resumes
VALKEY_HOST=localhost
VALKEY_PORT=6379
```

## Development

```bash
pnpm --filter personal-service dev   # Start
pnpm --filter personal-service test  # Test
```

---

**LLM Reference**: [.ai/services/personal-service.md](../../.ai/services/personal-service.md)
