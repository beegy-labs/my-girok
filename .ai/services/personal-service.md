# Personal Service

> Resume management with PostgreSQL + MinIO + BullMQ

## Tech Stack

| Component | Technology                |
| --------- | ------------------------- |
| Framework | NestJS 11, TypeScript 5.9 |
| Database  | PostgreSQL 16, Prisma 6   |
| Storage   | MinIO (S3-compatible)     |
| Queue     | BullMQ + Valkey           |
| Port      | REST :3002                |

## REST API

### Resume

| Method | Path                  | Auth | Description  |
| ------ | --------------------- | ---- | ------------ |
| GET    | `/resume`             | ✅   | List resumes |
| GET    | `/resume/:id`         | ✅   | Get resume   |
| POST   | `/resume`             | ✅   | Create       |
| PUT    | `/resume/:id`         | ✅   | Update       |
| DELETE | `/resume/:id`         | ✅   | Delete       |
| POST   | `/resume/:id/copy`    | ✅   | Duplicate    |
| PATCH  | `/resume/:id/default` | ✅   | Set default  |

### Attachments

| Method | Path                           | Auth | Description |
| ------ | ------------------------------ | ---- | ----------- |
| POST   | `/resume/:id/attachments`      | ✅   | Upload      |
| GET    | `/resume/:id/attachments`      | ✅   | List        |
| DELETE | `/resume/:id/attachments/:aid` | ✅   | Delete      |

### Public

| Method | Path                       | Auth | Description    |
| ------ | -------------------------- | ---- | -------------- |
| GET    | `/resume/public/:username` | ❌   | Default resume |
| GET    | `/resume/image-proxy?key=` | ❌   | Image proxy    |
| GET    | `/share/public/:token`     | ❌   | Shared resume  |

### User Preferences

| Method | Path                   | Description     |
| ------ | ---------------------- | --------------- |
| GET    | `/v1/user-preferences` | Get preferences |
| POST   | `/v1/user-preferences` | Upsert          |
| DELETE | `/v1/user-preferences` | Reset           |

## Key Models

### Resume

```prisma
model Resume {
  id, userId, title, name, email
  profileImage    // MinIO URL
  birthDate       // YYYY-MM-DD
  militaryService // COMPLETED, EXEMPTED, NOT_APPLICABLE
  copyStatus      // PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED

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

### Enums

| Enum            | Values                                                  |
| --------------- | ------------------------------------------------------- |
| PaperSize       | A4, LETTER                                              |
| Gender          | MALE, FEMALE, OTHER                                     |
| MilitaryService | COMPLETED, EXEMPTED, NOT_APPLICABLE                     |
| DegreeType      | HIGH_SCHOOL, ASSOCIATE_2/3, BACHELOR, MASTER, DOCTORATE |
| SectionType     | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE     |
| CopyStatus      | PENDING, IN_PROGRESS, COMPLETED, PARTIAL, FAILED        |

## File Storage (MinIO)

```
resumes/{userId}/{resumeId}/{uuid}.{ext}
tmp/{userId}/{uuid}.{ext}  # 24hr auto-cleanup
```

**Constraints**: 10 MB max, Image (JPEG/PNG/GIF/WEBP), Doc (PDF/DOCX)

## Environment

```bash
PORT=3002
DATABASE_URL=postgresql://user:pass@postgres:5432/personal
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=my-girok-resumes
VALKEY_HOST=localhost
VALKEY_PORT=6379
```

---

**Full schema**: `services/personal-service/prisma/schema.prisma`
