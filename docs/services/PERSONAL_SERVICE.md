# Personal Service Documentation

> Complete guide for the Resume & Profile management microservice

## Overview

The Personal Service handles resume management, file storage, share links, and user preferences for the My-Girok platform.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [API Endpoints](#api-endpoints)
3. [Database Schema](#database-schema)
4. [File Storage](#file-storage)
5. [Queue System](#queue-system)
6. [Environment Variables](#environment-variables)
7. [Development Guide](#development-guide)

---

## Tech Stack

| Component    | Technology                         |
| ------------ | ---------------------------------- |
| Framework    | NestJS 11 + TypeScript 5.9         |
| Database     | PostgreSQL 16 + Prisma 6           |
| File Storage | MinIO (S3-compatible)              |
| Queue        | BullMQ + Valkey (Redis-compatible) |
| Port         | 3002                               |

---

## API Endpoints

### Base URL

- **Development**: `http://localhost:3002`
- **Staging**: `https://my-api-dev.girok.dev/personal`
- **Production**: `https://my-api.girok.dev/personal`

### Resume CRUD

| Method | Endpoint                       | Auth | Description         |
| ------ | ------------------------------ | ---- | ------------------- |
| GET    | `/v1/resume`                   | Yes  | List user's resumes |
| GET    | `/v1/resume/default`           | Yes  | Get default resume  |
| GET    | `/v1/resume/:resumeId`         | Yes  | Get resume by ID    |
| POST   | `/v1/resume`                   | Yes  | Create new resume   |
| PUT    | `/v1/resume/:resumeId`         | Yes  | Update resume       |
| DELETE | `/v1/resume/:resumeId`         | Yes  | Delete resume       |
| PATCH  | `/v1/resume/:resumeId/default` | Yes  | Set as default      |
| POST   | `/v1/resume/:resumeId/copy`    | Yes  | Duplicate resume    |

### Section Management

| Method | Endpoint                                   | Auth | Description               |
| ------ | ------------------------------------------ | ---- | ------------------------- |
| PATCH  | `/v1/resume/:resumeId/sections/order`      | Yes  | Reorder sections          |
| PATCH  | `/v1/resume/:resumeId/sections/visibility` | Yes  | Toggle section visibility |

### Attachments

| Method | Endpoint                                   | Auth | Description             |
| ------ | ------------------------------------------ | ---- | ----------------------- |
| POST   | `/v1/resume/:resumeId/attachments`         | Yes  | Upload file (multipart) |
| GET    | `/v1/resume/:resumeId/attachments`         | Yes  | List attachments        |
| PATCH  | `/v1/resume/:resumeId/attachments/:id`     | Yes  | Update metadata         |
| DELETE | `/v1/resume/:resumeId/attachments/:id`     | Yes  | Delete attachment       |
| PATCH  | `/v1/resume/:resumeId/attachments/reorder` | Yes  | Reorder attachments     |

### Temp Upload (Preview Flow)

| Method | Endpoint                 | Auth | Description            |
| ------ | ------------------------ | ---- | ---------------------- |
| POST   | `/v1/resume/temp-upload` | Yes  | Upload to temp storage |
| DELETE | `/v1/resume/temp-upload` | Yes  | Delete temp file       |

### Public Access

| Method | Endpoint                      | Auth | Description                    |
| ------ | ----------------------------- | ---- | ------------------------------ |
| GET    | `/v1/resume/public/:username` | No   | Get default resume by username |
| GET    | `/v1/resume/image-proxy?key=` | No   | Image proxy for PDF export     |

### Share Links

| Method | Endpoint                     | Auth | Description             |
| ------ | ---------------------------- | ---- | ----------------------- |
| POST   | `/v1/share/resume/:resumeId` | Yes  | Create share link       |
| GET    | `/v1/share`                  | Yes  | List user's share links |
| GET    | `/v1/share/:id`              | Yes  | Get share link          |
| PATCH  | `/v1/share/:id`              | Yes  | Update share link       |
| DELETE | `/v1/share/:id`              | Yes  | Delete share link       |
| GET    | `/v1/share/public/:token`    | No   | Access shared resume    |

### User Preferences

| Method | Endpoint               | Auth | Description            |
| ------ | ---------------------- | ---- | ---------------------- |
| GET    | `/v1/user-preferences` | Yes  | Get preferences        |
| POST   | `/v1/user-preferences` | Yes  | Create/update (upsert) |
| PUT    | `/v1/user-preferences` | Yes  | Partial update         |
| DELETE | `/v1/user-preferences` | Yes  | Reset to defaults      |

---

## Database Schema

### Resume Model

```prisma
model Resume {
  id          String    @id @default(uuid())
  userId      String
  title       String
  description String?
  isDefault   Boolean   @default(false)
  paperSize   PaperSize @default(A4)

  // Basic Info
  name        String
  email       String
  phone       String?
  address     String?
  github      String?
  blog        String?
  linkedin    String?
  portfolio   String?
  summary     String?
  keyAchievements String[] @default([])
  profileImage    String?

  // Korean-specific
  birthDate       String?
  gender          Gender?
  militaryService MilitaryService?
  militaryRank    String?
  militaryDischargeType String?
  militaryServiceStartDate String?
  militaryServiceEndDate String?
  coverLetter     String?
  applicationReason String?

  // Async copy status
  copyStatus      CopyStatus?
  copyJobId       String?
  copyCompletedAt DateTime?

  // Relations
  sections     ResumeSection[]
  attachments  ResumeAttachment[]
  skills       Skill[]
  experiences  Experience[]
  educations   Education[]
  certificates Certificate[]
  shares       ShareLink[]
}
```

### Experience & Projects

```prisma
model Experience {
  id        String @id @default(uuid())
  resumeId  String
  company   String
  startDate String
  endDate   String?
  isCurrentlyWorking Boolean @default(false)
  finalPosition String
  jobTitle      String
  salary        Int?
  salaryUnit    String?
  showSalary    Boolean? @default(false)
  order         Int @default(0)
  visible       Boolean @default(true)

  projects ExperienceProject[]
}

model ExperienceProject {
  id           String @id @default(uuid())
  experienceId String
  name         String
  startDate    String
  endDate      String?
  description  String
  role         String?
  techStack    String[]
  url          String?
  githubUrl    String?
  order        Int @default(0)

  achievements ProjectAchievement[]
}

model ProjectAchievement {
  id        String  @id @default(uuid())
  projectId String
  content   String
  depth     Int     // 1-4 levels
  order     Int @default(0)
  parentId  String? // Self-referencing for hierarchy
}
```

### Enums

| Enum              | Values                                                             |
| ----------------- | ------------------------------------------------------------------ |
| `PaperSize`       | A4, LETTER                                                         |
| `Gender`          | MALE, FEMALE, OTHER                                                |
| `MilitaryService` | COMPLETED, EXEMPTED, NOT_APPLICABLE                                |
| `DegreeType`      | HIGH_SCHOOL, ASSOCIATE_2, ASSOCIATE_3, BACHELOR, MASTER, DOCTORATE |
| `GpaFormat`       | SCALE_4_0, SCALE_4_5, SCALE_100                                    |
| `SectionType`     | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE                |
| `AttachmentType`  | PROFILE_PHOTO, PORTFOLIO, CERTIFICATE, OTHER                       |
| `CopyStatus`      | PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED                   |

---

## File Storage

### MinIO Structure

Files are stored in a flat structure with type tracked in the database:

```
my-girok-resumes/
└── resumes/
    └── {userId}/
        └── {resumeId}/
            └── {uuid}.{ext}

my-girok-resumes/
└── tmp/
    └── {userId}/
        └── {uuid}.{ext}
```

### Upload Flow

1. **Temp Upload**: `POST /v1/resume/temp-upload`
   - Returns `tempKey` + `previewUrl`
   - Client displays preview using presigned URL

2. **Save Resume**: When resume is saved
   - Backend moves temp file to permanent storage
   - Updates `profileImage` field with permanent URL

3. **Cleanup**: MinIO lifecycle policy
   - Removes temp files after 24 hours

### File Validation

| Constraint  | Value                |
| ----------- | -------------------- |
| Max Size    | 10 MB                |
| Image Types | JPEG, PNG, GIF, WEBP |
| Doc Types   | PDF, DOCX            |

### Image Proxy

The image proxy endpoint serves MinIO images with proper CORS headers for PDF export:

```
GET /v1/resume/image-proxy?key={fileKey}

Response Headers:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, OPTIONS
- Access-Control-Allow-Headers: Content-Type
```

---

## Queue System

### BullMQ with Valkey

The service uses BullMQ with Valkey (Redis-compatible) for async job processing.

### Resume Copy Job

When copying a resume with attachments:

```
1. POST /v1/resume/:resumeId/copy
2. Resume created immediately with copyStatus: PENDING
3. BullMQ job queued for file copy
4. Job updates copyStatus as it progresses
5. Frontend polls for status

Copy Status Flow:
PENDING → IN_PROGRESS → COMPLETED (or PARTIAL/FAILED)
```

### Queue Configuration

```typescript
// Default queue settings
{
  connection: {
    host: process.env.VALKEY_HOST,
    port: process.env.VALKEY_PORT,
    password: process.env.VALKEY_PASSWORD,
    db: 1
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
}
```

---

## Environment Variables

```bash
# Server
PORT=3002

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/personal_db

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=my-girok-resumes
MINIO_USE_SSL=false

# Valkey (Redis-compatible)
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=your-password
VALKEY_DB=1

# JWT (for auth validation)
JWT_SECRET=your-secret-key
```

---

## Development Guide

### Running Locally

```bash
# Start service
pnpm --filter personal-service dev

# Run tests
pnpm --filter personal-service test

# Generate Prisma client
pnpm --filter personal-service prisma:generate

# Run migrations
pnpm --filter personal-service prisma:migrate
```

### Local MinIO Setup

```bash
# Start MinIO with Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Create bucket via console at http://localhost:9001
# Bucket name: my-girok-dev-resumes
```

### Testing File Upload

```bash
# Upload profile photo
curl -X POST http://localhost:3002/v1/resume/temp-upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@photo.jpg" \
  -F "type=PROFILE_PHOTO"

# Response
{
  "tempKey": "tmp/userId/uuid.jpg",
  "previewUrl": "https://minio/presigned-url"
}
```

---

## Related Documentation

- **LLM Reference**: [.ai/services/personal-service.md](../../.ai/services/personal-service.md)
- **Resume Guide**: [docs/guides/RESUME.md](../guides/RESUME.md)
- **Types Package**: [docs/packages/TYPES.md](../packages/TYPES.md)
- **Deployment**: [docs/policies/DEPLOYMENT.md](../policies/DEPLOYMENT.md)

---

_Last updated: 2025-12-24_
