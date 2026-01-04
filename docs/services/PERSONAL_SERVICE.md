# Personal Service

> Resume management, file storage, and user preferences

## Overview

The Personal Service handles resume management with rich content support including work experience, education, skills, and file attachments.

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3002                       |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | personal_db (PostgreSQL)   |
| Storage   | MinIO (S3-compatible)      |
| Queue     | BullMQ + Valkey            |

## API Reference

> See `.ai/services/personal-service.md` for quick endpoint list.

### Resume API

| Method | Endpoint                 | Auth | Description   |
| ------ | ------------------------ | ---- | ------------- |
| GET    | `/v1/resume`             | Yes  | List resumes  |
| GET    | `/v1/resume/:id`         | Yes  | Get resume    |
| POST   | `/v1/resume`             | Yes  | Create resume |
| PUT    | `/v1/resume/:id`         | Yes  | Update resume |
| DELETE | `/v1/resume/:id`         | Yes  | Delete resume |
| PATCH  | `/v1/resume/:id/default` | Yes  | Set default   |
| POST   | `/v1/resume/:id/copy`    | Yes  | Duplicate     |

### Sections & Attachments API

| Method | Endpoint                             | Auth | Description       |
| ------ | ------------------------------------ | ---- | ----------------- |
| PATCH  | `/v1/resume/:id/sections/order`      | Yes  | Reorder sections  |
| PATCH  | `/v1/resume/:id/sections/visibility` | Yes  | Toggle visibility |
| POST   | `/v1/resume/:id/attachments`         | Yes  | Upload file       |
| DELETE | `/v1/resume/:id/attachments/:id`     | Yes  | Delete file       |

### Public & Sharing API

| Method | Endpoint                      | Auth | Description       |
| ------ | ----------------------------- | ---- | ----------------- |
| GET    | `/v1/resume/public/:username` | No   | Public resume     |
| POST   | `/v1/share/resume/:resumeId`  | Yes  | Create share link |
| GET    | `/v1/share/public/:token`     | No   | Access shared     |

### User Preferences API

| Method | Endpoint               | Auth | Description        |
| ------ | ---------------------- | ---- | ------------------ |
| GET    | `/v1/user-preferences` | Yes  | Get preferences    |
| POST   | `/v1/user-preferences` | Yes  | Upsert preferences |
| DELETE | `/v1/user-preferences` | Yes  | Reset to defaults  |

## Database Schema

### Resume Model

```prisma
model Resume {
  id              String    @id @default(uuid())
  userId          String
  title           String
  name            String?
  email           String?
  phone           String?
  profileImage    String?   // MinIO URL
  birthDate       DateTime?
  gender          Gender?
  militaryService MilitaryService?
  paperSize       PaperSize @default(A4)
  isDefault       Boolean   @default(false)
  copyStatus      CopyStatus?
  deletedAt       DateTime? // Soft delete

  sections    ResumeSection[]
  skills      Skill[]
  experiences Experience[]
  educations  Education[]
  attachments Attachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Experience Model

```prisma
model Experience {
  id            String   @id @default(uuid())
  resumeId      String
  company       String
  startDate     DateTime
  endDate       DateTime?
  isCurrent     Boolean  @default(false)
  finalPosition String?
  jobTitle      String?
  description   String?
  orderIndex    Int      @default(0)

  projects ExperienceProject[]
}

model ExperienceProject {
  id           String   @id @default(uuid())
  experienceId String
  name         String
  description  String?
  techStack    String[]
  achievements String[]
  orderIndex   Int      @default(0)
}
```

## Enums

| Enum            | Values                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| PaperSize       | A4, LETTER                                                                                                           |
| Gender          | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY                                                                               |
| MilitaryService | COMPLETED, EXEMPTED, NOT_APPLICABLE                                                                                  |
| DegreeType      | HIGH_SCHOOL, ASSOCIATE_2, ASSOCIATE_3, BACHELOR, MASTER, DOCTORATE                                                   |
| SectionType     | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE, KEY_ACHIEVEMENTS, APPLICATION_REASON, ATTACHMENTS, COVER_LETTER |
| CopyStatus      | PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED                                                                     |

## File Storage (MinIO)

### Bucket Structure

```
my-girok-resumes/
├── resumes/{userId}/{resumeId}/{uuid}.{ext}  # Permanent files
└── tmp/{userId}/{uuid}.{ext}                  # Temp files (24h TTL)
```

### File Constraints

| Constraint  | Value                |
| ----------- | -------------------- |
| Max Size    | 10 MB                |
| Image Types | JPEG, PNG, GIF, WEBP |
| Doc Types   | PDF, DOCX            |

### Upload Flow

1. Client uploads file to `/v1/resume/:id/attachments`
2. File stored in MinIO with generated UUID filename
3. Reference saved in database with original filename
4. Temp files cleaned up after 24 hours

## Soft Delete

Resume supports soft delete with `deletedAt` timestamp:

```typescript
// Exclude deleted resumes (default)
findMany({ where: { deletedAt: null } });

// Include deleted resumes
findMany({ where: {} });

// Restore deleted resume
update({ where: { id }, data: { deletedAt: null } });
```

## Caching Strategy

| Key Pattern                     | TTL | Invalidation       |
| ------------------------------- | --- | ------------------ |
| `personal:user_id:{username}`   | 2h  | User delete        |
| `personal:preferences:{userId}` | 1h  | Preferences update |

```typescript
import { CacheKey } from '@my-girok/nest-common';

const key = CacheKey.make('personal', 'preferences', userId);
// → "dev:personal:preferences:550e8400..."
```

## Development

```bash
# Start service
pnpm --filter personal-service dev

# Run tests
pnpm --filter personal-service test

# Run migrations
goose -dir migrations/personal postgres "$DATABASE_URL" up
```

## Related Documentation

- [Resume Feature Guide](../guides/RESUME.md)
- [Caching Policy](../policies/CACHING.md)
