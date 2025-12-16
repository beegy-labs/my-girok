# Personal Service

> **Personal data management microservice** - Resume, Share, User Preferences

## Overview

| Property | Value |
|----------|-------|
| Port | 4002 |
| Database | PostgreSQL (personal DB) |
| Storage | MinIO (file attachments) |
| Queue | BullMQ + Redis (async file copy) |
| Auth | JWT (shared secret with auth-service) |

## Tech Stack

- NestJS 11 + TypeScript
- Prisma 6 (PostgreSQL)
- MinIO (S3-compatible storage)
- BullMQ (async job processing)
- Sharp (image processing)

## Modules

### Resume Module (`/api/v1/resume`)

Manages Korean developer resumes with sections, skills, experiences, education, certificates.

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/:username` | Public | Get user's default resume by username |
| GET | `/image-proxy` | Public | Proxy images for PDF export (CORS) |
| POST | `/` | JWT | Create new resume |
| GET | `/` | JWT | Get all my resumes |
| GET | `/default` | JWT | Get my default resume |
| GET | `/:resumeId` | JWT | Get specific resume |
| PUT | `/:resumeId` | JWT | Update resume |
| DELETE | `/:resumeId` | JWT | Delete resume |
| PATCH | `/:resumeId/default` | JWT | Set as default |
| POST | `/:resumeId/copy` | JWT | Copy/duplicate resume |
| PATCH | `/:resumeId/sections/order` | JWT | Update section order |
| PATCH | `/:resumeId/sections/visibility` | JWT | Toggle section visibility |

**Attachments:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/temp-upload` | JWT | Upload to temp storage |
| DELETE | `/temp-upload` | JWT | Delete temp file |
| POST | `/:resumeId/attachments` | JWT | Upload attachment |
| GET | `/:resumeId/attachments` | JWT | Get attachments |
| PATCH | `/:resumeId/attachments/:id` | JWT | Update attachment |
| DELETE | `/:resumeId/attachments/:id` | JWT | Delete attachment |
| PATCH | `/:resumeId/attachments/reorder` | JWT | Reorder attachments |

### Share Module (`/api/v1/share`)

Generates shareable links for resumes with expiration and view tracking.

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/resume/:resumeId` | JWT | Create share link |
| GET | `/` | JWT | Get my share links |
| GET | `/:id` | JWT | Get share link by ID |
| PATCH | `/:id` | JWT | Update share settings |
| DELETE | `/:id` | JWT | Delete share link |
| GET | `/public/:token` | Public | Access shared resume |

### User Preferences Module (`/api/v1/user-preferences`)

Stores user settings (theme, section order).

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | Get preferences (creates default if none) |
| POST | `/` | JWT | Create/update (upsert) |
| PUT | `/` | JWT | Partial update |
| DELETE | `/` | JWT | Reset to defaults |

## Key Features

### Profile Photo Grayscale Conversion
- Profile photos auto-converted to grayscale using Sharp
- Original color image preserved at `originalUrl`

### Async Resume Copy
- When copying resume with attachments, files are copied asynchronously
- Uses BullMQ for job processing
- Status tracked: `PENDING` → `IN_PROGRESS` → `COMPLETED`/`PARTIAL`/`FAILED`

### Section Ordering
- Resume sections (SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE) can be reordered
- Each section can be toggled visible/hidden
- Order persisted in `resume_sections` table

## Database Models

### Resume
Main resume model with:
- Basic info (name, email, phone, address)
- Social links (github, blog, linkedin, portfolio)
- Korean-specific: military service, cover letter
- Relations: skills, experiences, educations, certificates, attachments, shares

### Experience (Work History)
- Company, dates, position, job title
- Nested `ExperienceProject` for projects at company
- `ProjectAchievement` with hierarchical structure (up to 4 depth levels)

### ShareLink
- Token-based access
- Expiration support
- View count and last viewed tracking

## Configuration

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/personal

# JWT (same secret as auth-service)
JWT_SECRET=your-secret

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-key
MINIO_SECRET_KEY=your-secret
MINIO_BUCKET=my-girok-resumes

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Bootstrap

Uses `@my-girok/nest-common` for standard bootstrap:

```typescript
import { configureApp } from '@my-girok/nest-common';

const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'My-Girok Personal Service',
  description: 'Personal data management microservice',
  defaultPort: 4002,
  swaggerTags: [
    { name: 'resume', description: 'Resume management' },
    { name: 'share', description: 'Share link management' },
    { name: 'user-preferences', description: 'User preferences' },
  ],
});
```

## Health Checks

Standard endpoints from `@my-girok/nest-common`:
- `GET /health` - General health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
