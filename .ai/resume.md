# Resume Management

> Resume feature for Korean market with hierarchical data

## Data Structure

```
Resume
├── Basic Info (name, email, phone, profileImage)
├── Korean Fields (military, coverLetter, applicationReason)
├── Key Achievements (string[])
└── Dynamic Sections (reorderable)
    ├── Skills (Category → Items → Descriptions)
    ├── Experience (Company → Projects → Achievements)
    ├── Education
    └── Certificates
```

## Experience Structure

```
Company
├── startDate/endDate, isCurrentlyWorking
├── finalPosition, jobTitle
└── Projects[]
    ├── name, role, description
    ├── techStack[], url, githubUrl
    └── achievements[] (4-depth hierarchical)
        • → ◦ → ▪ → ▫
```

## Skills Structure

```
Category (e.g., "Frontend")
└── Items[]
    ├── name (e.g., "React")
    └── descriptions[] (4-depth)
```

## Section Types (8)

| Type               | Korean     |
| ------------------ | ---------- |
| EXPERIENCE         | 경력       |
| EDUCATION          | 학력       |
| SKILLS             | 기술       |
| CERTIFICATE        | 자격증     |
| KEY_ACHIEVEMENTS   | 핵심성과   |
| APPLICATION_REASON | 지원동기   |
| ATTACHMENTS        | 첨부파일   |
| COVER_LETTER       | 자기소개서 |

## API Endpoints

```
POST   /v1/resume              # Create
GET    /v1/resume              # List
GET    /v1/resume/:id          # Get one
PUT    /v1/resume/:id          # Update
DELETE /v1/resume/:id          # Delete
PATCH  /v1/resume/:id/default  # Set default
POST   /v1/resume/:id/copy     # Duplicate

GET /v1/resume/public/:username  # Public
GET /v1/share/public/:token      # Shared
```

## Critical Patterns

### Skills Save (CRITICAL)

```typescript
// ❌ DON'T - corrupts nested JSON
await tx.skill.createMany({ data: skills });

// ✅ DO - properly serializes JSON
for (const skill of skills) {
  await tx.skill.create({ data: skill });
}
```

### Strip DB Fields Before API

```typescript
// stripIds() removes: id, projectId, resumeId, experienceId, parentId, createdAt, updatedAt
const data = prepareResumeForSubmit(formData);
await updateResume(id, data);
```

## Korean Market Fields

| Field             | Korean     | Type                              |
| ----------------- | ---------- | --------------------------------- |
| birthDate         | 생년월일   | YYYY-MM-DD                        |
| gender            | 성별       | MALE/FEMALE/OTHER                 |
| militaryService   | 병역       | COMPLETED/EXEMPTED/NOT_APPLICABLE |
| coverLetter       | 자기소개서 | string                            |
| applicationReason | 지원동기   | string                            |
| keyAchievements   | 핵심성과   | string[]                          |

## PDF/Print

- Uses `@react-pdf/renderer` + `react-pdf`
- Paper sizes: A4, Letter
- `sanitizeText()` removes emojis for PDF fonts
- `imageToBase64()` for CORS bypass

## File Locations

| Purpose | Path                                                    |
| ------- | ------------------------------------------------------- |
| Schema  | `services/personal-service/prisma/schema.prisma`        |
| Types   | `packages/types/src/resume/`                            |
| Form UI | `apps/web-main/src/components/resume/ResumeForm.tsx`    |
| Preview | `apps/web-main/src/components/resume/ResumePreview.tsx` |

---

**Human docs**: [docs/guides/RESUME.md](../docs/guides/RESUME.md)
