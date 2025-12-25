# Resume Management - LLM Guide

> Quick reference for AI assistants working with the resume feature

## Data Structure

```
Resume
├── Basic Info (name, email, phone, profileImage, birthDate, gender)
├── Korean Fields (militaryService, coverLetter, applicationReason)
├── Key Achievements (keyAchievements: string[])
└── Dynamic Sections (reorderable)
    ├── Skills (Category → Items → Hierarchical Descriptions, 4 depth)
    ├── Experience (Company → Projects → Achievements, 4 depth)
    ├── Education (degree enum, drag-and-drop)
    └── Certificates
```

## Work Experience Structure

```
Company
├── startDate/endDate, isCurrentlyWorking (boolean)
├── finalPosition (required) - "Backend Team Lead"
├── jobTitle (required) - "Senior Developer"
├── Auto-calculated: Duration (e.g., "6년 8개월")
└── Projects[]
    ├── name, role, description
    ├── startDate/endDate, techStack[], url/githubUrl
    └── achievements (hierarchical, 4 depth: • → ◦ → ▪ → ▫)
```

## Skills Structure

```
Skill Category (e.g., "Frontend")
└── Skill Items[]
    ├── name (required) - "React"
    └── descriptions[] (hierarchical, 4 depth: • → ◦ → ▪ → ▫)
```

## API Endpoints

```
POST   /v1/resume              # Create
GET    /v1/resume              # Get all
GET    /v1/resume/:id          # Get one
PUT    /v1/resume/:id          # Update
DELETE /v1/resume/:id          # Delete
PATCH  /v1/resume/:id/default  # Set default
POST   /v1/resume/:id/copy     # Duplicate

PATCH /v1/resume/:id/sections/order       # Reorder
PATCH /v1/resume/:id/sections/visibility  # Toggle

GET /v1/resume/public/:username  # Public resume by username
GET /v1/share/public/:token      # Shared resume by token

POST   /v1/share/resume/:resumeId  # Create share link
GET    /v1/share                   # Get my share links
PATCH  /v1/share/:id               # Update share link
DELETE /v1/share/:id               # Delete share link
```

## Key Patterns

### Saving Skills with JSON Fields

```typescript
// ❌ DON'T - corrupts nested JSON
await tx.skill.createMany({ data: skills });

// ✅ DO - properly serializes JSON
for (const skill of skills) {
  await tx.skill.create({ data: skill });
}
```

### Adding New Fields

1. Update schema: `services/personal-service/prisma/schema.prisma`
2. Update types: `apps/web-main/src/api/resume.ts`
3. Update DTO: `services/personal-service/src/resume/dto/create-resume.dto.ts`
4. Update service: Include in create/update operations
5. Update UI: Add to component with library theme
6. Update preview: Add to ResumePreview

### Performance

```typescript
// ✅ Memoize handlers
const handleClick = useCallback((id) => navigate(`/edit/${id}`), [navigate]);

// ✅ Direct navigation (not state + useEffect)
const handleSubmit = async (data) => {
  const created = await createResume(data);
  navigate(`/preview/${created.id}`);
};

// ✅ 800ms debounce on form changes
```

## Korean Market Fields

| Field             | Type     | Purpose                             |
| ----------------- | -------- | ----------------------------------- |
| birthDate         | string   | YYYY-MM-DD, 만 나이 calculation     |
| gender            | enum     | MALE, FEMALE, OTHER                 |
| militaryService   | enum     | COMPLETED, EXEMPTED, NOT_APPLICABLE |
| coverLetter       | string   | 자기소개서                          |
| applicationReason | string   | 지원 동기                           |
| keyAchievements   | string[] | 주요 성과                           |

## Print & PDF

- **Print**: Uses Paged.js paginated view
- **PDF Export**: Uses Paged.js with multi-page support
- **Paper Size**: A4 or Letter (dynamic)
- **Margins**: 0.5cm on all sides
- **Required Print Settings**: Margins=None, Headers/footers=None, Background graphics=On

## File Storage

| Aspect   | Policy                                            |
| -------- | ------------------------------------------------- |
| Storage  | Original color image only                         |
| Display  | Color default, CSS grayscale toggle               |
| Location | MinIO: `resumes/{userId}/{resumeId}/{uuid}.{ext}` |

## Common Mistakes

❌ **DON'T**:

- Use `createMany` for nested JSON (Skills)
- Send DB fields (`id`, `createdAt`, `updatedAt`) to API
- Use inline functions in map() iterations
- Use state for navigation

✅ **DO**:

- Use individual `create()` for Skills
- Strip DB fields with `prepareResumeForSubmit()`
- Memoize all event handlers with useCallback
- Call navigate() directly in handlers

## File Locations

| Path                                                              | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| `services/personal-service/prisma/schema.prisma`                  | Schema           |
| `apps/web-main/src/api/resume.ts`                                 | Types            |
| `services/personal-service/src/resume/dto/`                       | DTOs             |
| `services/personal-service/src/resume/resume.service.ts`          | Service          |
| `apps/web-main/src/components/resume/ResumeForm.tsx`              | Form UI          |
| `apps/web-main/src/components/resume/ResumePreview.tsx`           | Preview          |
| `apps/web-main/src/components/resume/HierarchicalDescription.tsx` | Reusable 4-depth |

## Recent Updates

**2025-12-23**: Fixed PDF rendering crash (#321)

- Added `sanitizeText()` for emoji/Unicode removal
- Added `safeResume` wrapper for defensive empty handling
- Added 800ms debounce to ResumeForm onChange

---

**Detailed docs**: `docs/guides/RESUME.md`
