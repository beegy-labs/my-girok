# Personal Service

> Resume management with PostgreSQL + MinIO + BullMQ

## Service Info

| Property | Value                        |
| -------- | ---------------------------- |
| REST     | :3002                        |
| Database | personal_db (PostgreSQL)     |
| Storage  | MinIO (S3-compatible)        |
| Queue    | BullMQ + Valkey              |
| Codebase | `services/personal-service/` |

## REST API

### Resume CRUD

```
POST/GET/PUT/DELETE  /resume, /resume/:id
PATCH                /resume/:id/default
POST                 /resume/:id/copy
```

### Sections & Attachments

```
PATCH   /resume/:id/sections/order|visibility
POST    /resume/:id/attachments
DELETE  /resume/:id/attachments/:aid
```

### Public Access

```
GET     /resume/public/:username       # Default resume (no auth)
GET     /resume/image-proxy?key=       # Image proxy (no auth)
GET     /share/public/:token           # Shared resume (no auth)
POST    /share/resume/:resumeId        # Create share link (auth)
```

### User Preferences

```
GET/POST/DELETE  /v1/user-preferences
```

## Key Models

### Resume

```prisma
model Resume {
  id, userId, title, name, email
  profileImage      // MinIO URL
  birthDate         // YYYY-MM-DD
  militaryService   // COMPLETED, EXEMPTED, NOT_APPLICABLE
  copyStatus        // PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED
  sections, attachments, skills, experiences, educations
}
```

### Experience

```prisma
model Experience {
  company, startDate, endDate, finalPosition, jobTitle
  projects: ExperienceProject[]
}

model ExperienceProject {
  name, description, techStack[], achievements[]
}
```

## Enums

| Enum            | Values                                                    |
| --------------- | --------------------------------------------------------- |
| PaperSize       | A4, LETTER                                                |
| Gender          | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY                    |
| MilitaryService | COMPLETED, EXEMPTED, NOT_APPLICABLE                       |
| DegreeType      | HIGH_SCHOOL, ASSOCIATE_2/3, BACHELOR, MASTER, DOCTORATE   |
| SectionType     | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE, etc. |
| CopyStatus      | PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED          |

## File Storage (MinIO)

```
resumes/{userId}/{resumeId}/{uuid}.{ext}   # Permanent
tmp/{userId}/{uuid}.{ext}                   # 24hr auto-cleanup
```

| Constraint  | Value                |
| ----------- | -------------------- |
| Max Size    | 10 MB                |
| Image Types | JPEG, PNG, GIF, WEBP |
| Doc Types   | PDF, DOCX            |

## Caching (Valkey DB 1)

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
