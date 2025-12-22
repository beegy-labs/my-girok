# Personal Service

> Resume management with PostgreSQL + MinIO

## Tech Stack

| Component | Technology                     |
| --------- | ------------------------------ |
| Framework | NestJS 11, TypeScript 5.9      |
| Database  | PostgreSQL 16, Prisma 6        |
| Storage   | MinIO (S3-compatible)          |
| Queue     | BullMQ + Valkey (Redis-compat) |
| Port      | REST :3002                     |

## Database Schema

### Resume (Core)

```prisma
model Resume {
  id          String    @id @default(uuid())
  userId      String
  title       String    // "회사용", "프리랜서용"
  description String?
  isDefault   Boolean   @default(false)
  paperSize   PaperSize @default(A4)  // A4, LETTER

  // Basic Info
  name        String
  email       String
  phone       String?
  address     String?   // City/District level
  github      String?
  blog        String?
  linkedin    String?
  portfolio   String?
  summary     String?
  keyAchievements String[] @default([])  // 3-5 major accomplishments
  profileImage    String?  // MinIO URL

  // Korean-specific (optional)
  birthYear       Int?            // deprecated, use birthDate
  birthDate       String?         // YYYY-MM-DD
  gender          Gender?         // MALE, FEMALE, OTHER
  militaryService MilitaryService? // COMPLETED, EXEMPTED, NOT_APPLICABLE
  militaryDischarge String?       // e.g., "병장 제대"
  militaryRank    String?         // e.g., "병장", "상병"
  militaryDischargeType String?   // e.g., "만기전역"
  militaryServiceStartDate String? // YYYY-MM
  militaryServiceEndDate String?  // YYYY-MM
  coverLetter     String?
  applicationReason String?

  // Async copy status (BullMQ)
  copyStatus      CopyStatus?  // PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED
  copyJobId       String?
  copyCompletedAt DateTime?    // Timestamp when copy completed

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
  startDate String   // "2023-01"
  endDate   String?  // null = currently working
  isCurrentlyWorking Boolean @default(false)
  finalPosition String  // "Backend Team Lead"
  jobTitle      String  // "Senior Developer"
  salary        Int?
  salaryUnit    String? // "만원", "USD"
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

  achievements ProjectAchievement[]  // 4-depth hierarchy
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

### Section & Attachments

```prisma
model ResumeSection {
  id       String      @id @default(uuid())
  resumeId String
  type     SectionType // SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE
  order    Int @default(0)
  visible  Boolean @default(true)
}

model ResumeAttachment {
  id          String         @id @default(uuid())
  resumeId    String
  type        AttachmentType // PROFILE_PHOTO, PORTFOLIO, CERTIFICATE, OTHER
  fileName    String
  fileKey     String         // MinIO object key
  fileUrl     String
  fileSize    Int
  mimeType    String
  isProcessed Boolean @default(false)  // Grayscale conversion
  originalUrl String?        // Before grayscale
  title       String?
  description String?
  order       Int @default(0)
  visible     Boolean @default(true)
}
```

### Supporting Models

| Model             | Purpose          | Key Fields                                   |
| ----------------- | ---------------- | -------------------------------------------- |
| `Skill`           | Technical skills | category, items (JSON), order                |
| `Education`       | Academic history | school, major, degree (enum), gpa, gpaFormat |
| `Certificate`     | Certifications   | name, issuer, issueDate, credentialUrl       |
| `ShareLink`       | Public sharing   | token, resourceType, expiresAt, viewCount    |
| `UserPreferences` | User settings    | theme (LIGHT/DARK), sectionOrder (JSON)      |

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

## REST API

### Resume CRUD

| Method   | Path                        | Auth | Description        |
| -------- | --------------------------- | ---- | ------------------ |
| `GET`    | `/resume`                   | ✅   | List my resumes    |
| `GET`    | `/resume/default`           | ✅   | Get default resume |
| `GET`    | `/resume/:resumeId`         | ✅   | Get resume by ID   |
| `POST`   | `/resume`                   | ✅   | Create resume      |
| `PUT`    | `/resume/:resumeId`         | ✅   | Update resume      |
| `DELETE` | `/resume/:resumeId`         | ✅   | Delete resume      |
| `PATCH`  | `/resume/:resumeId/default` | ✅   | Set as default     |
| `POST`   | `/resume/:resumeId/copy`    | ✅   | Duplicate resume   |

### Section Management

| Method  | Path                                    | Auth | Description               |
| ------- | --------------------------------------- | ---- | ------------------------- |
| `PATCH` | `/resume/:resumeId/sections/order`      | ✅   | Reorder sections          |
| `PATCH` | `/resume/:resumeId/sections/visibility` | ✅   | Toggle section visibility |

### Attachments

| Method   | Path                                    | Auth | Description             |
| -------- | --------------------------------------- | ---- | ----------------------- |
| `POST`   | `/resume/:resumeId/attachments`         | ✅   | Upload file (multipart) |
| `GET`    | `/resume/:resumeId/attachments`         | ✅   | List attachments        |
| `PATCH`  | `/resume/:resumeId/attachments/:id`     | ✅   | Update metadata         |
| `DELETE` | `/resume/:resumeId/attachments/:id`     | ✅   | Delete attachment       |
| `PATCH`  | `/resume/:resumeId/attachments/reorder` | ✅   | Reorder attachments     |

### Temp Upload (Preview Flow)

| Method   | Path                  | Auth | Description            |
| -------- | --------------------- | ---- | ---------------------- |
| `POST`   | `/resume/temp-upload` | ✅   | Upload to temp storage |
| `DELETE` | `/resume/temp-upload` | ✅   | Delete temp file       |

### Public Access

| Method | Path                       | Auth | Description                    |
| ------ | -------------------------- | ---- | ------------------------------ |
| `GET`  | `/resume/public/:username` | ❌   | Get default resume by username |
| `GET`  | `/resume/image-proxy?key=` | ❌   | Image proxy for PDF export     |

### Share Links

| Method   | Path                      | Auth | Description          |
| -------- | ------------------------- | ---- | -------------------- |
| `POST`   | `/share/resume/:resumeId` | ✅   | Create share link    |
| `GET`    | `/share`                  | ✅   | List my share links  |
| `GET`    | `/share/:id`              | ✅   | Get share link       |
| `PATCH`  | `/share/:id`              | ✅   | Update share link    |
| `DELETE` | `/share/:id`              | ✅   | Delete share link    |
| `GET`    | `/share/public/:token`    | ❌   | Access shared resume |

### User Preferences

| Method   | Path                   | Auth | Description            |
| -------- | ---------------------- | ---- | ---------------------- |
| `GET`    | `/v1/user-preferences` | ✅   | Get preferences        |
| `POST`   | `/v1/user-preferences` | ✅   | Create/update (upsert) |
| `PUT`    | `/v1/user-preferences` | ✅   | Partial update         |
| `DELETE` | `/v1/user-preferences` | ✅   | Reset to defaults      |

## File Storage (MinIO)

### Structure

Files are stored in a flat structure with type tracked in the database:

```
resumes/
└── {userId}/
    └── {resumeId}/
        └── {uuid}.{ext}    # All file types in flat structure

tmp/
└── {userId}/
    └── {uuid}.{ext}        # Temporary uploads (24hr auto-cleanup via MinIO lifecycle)
```

> **Note**: File type (PROFILE_PHOTO, PORTFOLIO, CERTIFICATE, OTHER) is stored in the database `ResumeAttachment.type` field, not in the folder structure.

### Upload Flow

1. **Temp upload**: `POST /resume/temp-upload` → returns `tempKey` + `previewUrl`
2. **Preview**: Client displays image using `previewUrl`
3. **Save resume**: Backend moves temp file to permanent storage
4. **Cleanup**: MinIO lifecycle policy removes temp files after 24 hours

### File Validation

| Constraint  | Value                |
| ----------- | -------------------- |
| Max size    | 10 MB                |
| Image types | JPEG, PNG, GIF, WEBP |
| Doc types   | PDF, DOCX            |

### Image Proxy

- `GET /resume/image-proxy?key={fileKey}` - Serves MinIO images with CORS headers
- Used by PDF export (html2canvas) to avoid CORS issues

### CORS Configuration

The image proxy requires proper CORS setup for PDF export to work:

```typescript
// CORS headers set by image-proxy endpoint
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type

// MinIO bucket policy must allow public read for image-proxy to work
```

> **Note**: Grayscale conversion for profile photos is handled by frontend CSS filter, not backend processing.

## Queue (BullMQ)

### Resume Copy Job

When copying resume with attachments:

1. Resume created immediately with `copyStatus: PENDING`
2. BullMQ job queued for file copy
3. Job updates `copyStatus` as it progresses
4. Frontend polls or uses websocket for status

```typescript
// Resume copy statuses
PENDING     → Job queued
IN_PROGRESS → Copying files
COMPLETED   → All files copied
PARTIAL     → Some files failed
FAILED      → All files failed
```

## Environment Variables

```bash
PORT=3002
DATABASE_URL=postgresql://user:pass@postgres:5432/personal

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_BUCKET=my-girok-resumes

# Valkey (Redis-compatible, for BullMQ)
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=xxx     # Optional
VALKEY_DB=1             # Database index (default: 1)

# JWT
JWT_SECRET=xxx
```

> **Note**: This service uses [Valkey](https://valkey.io/) (Redis fork) for BullMQ. Environment variables use `VALKEY_*` prefix.

## Integration

| Direction  | Service | Protocol                 | Purpose           |
| ---------- | ------- | ------------------------ | ----------------- |
| ← web-main | REST    | Resume CRUD, file upload |                   |
| → MinIO    | S3 API  | File storage             |                   |
| → Valkey   | BullMQ  | Async job queue          | Resume copy, etc. |
