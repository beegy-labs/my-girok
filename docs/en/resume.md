# Resume Management

> Resume creation, editing, and sharing functionality with Korean market support

## Data Structure

```yaml
Resume:
  Basic: name, email, phone, profileImage, birthDate, gender
  Korean: militaryService, coverLetter, applicationReason
  keyAchievements: string[]
  Sections:
    - Skills: Category -> Items -> Descriptions (4 depth)
    - Experience: Company -> Projects -> Achievements (4 depth)
    - Education: degree enum, drag-and-drop
    - Certificates

Experience:
  startDate/endDate, isCurrentlyWorking
  finalPosition, jobTitle
  Projects[]: name, role, description, techStack[], achievements[]

Skills:
  Category -> Items[]: name, descriptions[] (4 depth: . -> o -> - -> *)
```

The resume structure supports nested hierarchies up to 4 levels deep, enabling detailed skill and experience representation.

## API Endpoints

### Resume CRUD

```
POST   /v1/resume              # Create
GET    /v1/resume              # Get all
GET    /v1/resume/:id          # Get one
PUT    /v1/resume/:id          # Update
DELETE /v1/resume/:id          # Delete
PATCH  /v1/resume/:id/default  # Set default
POST   /v1/resume/:id/copy     # Duplicate
```

### Sharing

```
GET /v1/resume/public/:username  # Public resume
GET /v1/share/public/:token      # Shared resume
POST /v1/share/resume/:resumeId  # Create share link
```

## Patterns

### Nested JSON Handling

```typescript
// DON'T - corrupts nested JSON
await tx.skill.createMany({ data: skills });

// DO - properly serializes JSON
for (const skill of skills) {
  await tx.skill.create({ data: skill });
}
```

Prisma's `createMany` can corrupt nested JSON structures. Always use individual creates in a loop for complex nested data.

### Performance Optimization

```typescript
// Memoize handlers
const handleClick = useCallback((id) => navigate(`/edit/${id}`), [navigate]);

// 800ms debounce on form changes
```

Use memoization for event handlers and debounce form auto-save operations to prevent excessive API calls.

## Korean Market Fields

| Field             | Type     | Purpose           |
| ----------------- | -------- | ----------------- |
| birthDate         | string   | YYYY-MM-DD        |
| gender            | enum     | MALE, FEMALE, ... |
| militaryService   | enum     | COMPLETED, ...    |
| coverLetter       | string   | Self-intro        |
| applicationReason | string   | Motivation        |
| keyAchievements   | string[] | Key achievements  |

Korean job applications commonly require these additional fields that aren't typical in Western resumes.

## PDF & Print

```yaml
Library: @react-pdf/renderer + react-pdf
Paper: A4 or Letter
Margins: 0.5cm all sides
Image: Color stored, CSS grayscale toggle
Storage: MinIO resumes/{userId}/{resumeId}/{uuid}.{ext}
```

The PDF generation supports both A4 (international) and Letter (US) paper sizes with minimal margins for maximum content space.

## Key Files

| Path                                             | Purpose |
| ------------------------------------------------ | ------- |
| `services/personal-service/prisma/schema.prisma` | Schema  |
| `apps/web-main/src/api/resume.ts`                | Types   |
| `apps/web-main/src/components/resume/*`          | UI      |

---

**LLM Reference**: `docs/llm/resume.md`
