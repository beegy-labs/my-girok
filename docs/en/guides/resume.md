# Resume Feature Guide

> Building and managing professional resumes with real-time preview and PDF export

## Architecture Overview

```
ResumeEditPage
├── ResumeForm (input, 800ms debounce)
│   ├── SectionOrderManager (drag-drop)
│   ├── ExperienceSection
│   ├── EducationSection
│   ├── SkillsSection
│   └── HierarchicalDescription (4 depth)
└── ResumePreviewContainer
    └── ResumePdfDocument (@react-pdf/renderer)
```

## Data Flow

```
User Input -> ResumeForm -> onChange (800ms debounce) -> PDF Preview
                 |
                 v
            Save -> API -> personal-service -> Database
```

Changes are debounced to prevent excessive re-renders and API calls while maintaining a responsive feel.

## Section Types

| Type               | Icon | Korean     | Notes                             |
| ------------------ | ---- | ---------- | --------------------------------- |
| BASIC_INFO         | -    | 기본정보   | Always first, not reorderable     |
| EXPERIENCE         | 💼   | 경력       | Company → Projects → Achievements |
| EDUCATION          | 🎓   | 학력       | Drag-drop ordering, degree enum   |
| SKILLS             | ⚡   | 기술       | Category → Items → Descriptions   |
| CERTIFICATE        | 🏆   | 자격증     |                                   |
| KEY_ACHIEVEMENTS   | 🏅   | 핵심성과   | Array of strings                  |
| APPLICATION_REASON | 💡   | 지원동기   |                                   |
| COVER_LETTER       | 📝   | 자기소개서 |                                   |

## Korean Market Specific Fields

The resume system includes fields specifically for the Korean job market:

| Field             | Type       | Purpose                                |
| ----------------- | ---------- | -------------------------------------- |
| birthDate         | YYYY-MM-DD | Calculate 만 나이 (Korean age)         |
| gender            | enum       | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| militaryService   | enum       | COMPLETED, EXEMPTED, NOT_APPLICABLE    |
| coverLetter       | string     | 자기소개서 (self-introduction)         |
| applicationReason | string     | 지원 동기 (motivation for applying)    |
| keyAchievements   | string[]   | 주요 성과 (key accomplishments)        |

## Hierarchical Achievements

Support for 4-level nested achievements:

```
• Depth 1 (Main)
  ◦ Depth 2 (Sub)
    ▪ Depth 3 (Details)
      ▫ Depth 4 (Specific)
```

Used in Experience (achievements) and Skills (descriptions) sections.

## Paged.js Integration

For paginated print preview:

```typescript
useEffect(() => {
  if (viewMode === 'paginated' && contentRef.current) {
    const paged = new Previewer();
    const dynamicCSS = `@page {
      size: ${paperSize === 'A4' ? 'A4' : 'letter'};
      margin: 0;
    }`;
    paged.preview(content, [dynamicCSS], container);
  }
}, [viewMode, resume, paperSize]);
```

## Print CSS

```css
@media print {
  #resume-content {
    display: none !important;
  }
  .pagedjs-container {
    display: block !important;
  }
  .pagedjs_page {
    width: 100% !important;
    max-width: 100% !important;
  }
  a,
  span,
  p,
  div,
  li {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  img,
  video,
  svg {
    max-width: 100% !important;
    height: auto !important;
  }
}
```

## Recommended Print Settings

| Setting             | Value        |
| ------------------- | ------------ |
| Margins             | None         |
| Headers/footers     | None         |
| Background graphics | On           |
| Paper Size          | A4 or Letter |

## PDF Export Functions

```typescript
exportResumeToPDF(); // Download as file
generateResumePDFBlob(); // Get as Blob
generateResumePDFBase64(); // Get as Base64
printResumePDF(); // Open print dialog
```

Images are converted to Base64 for CORS bypass during PDF generation.

## React 19 Compatibility

```typescript
// Use pdf() function instead of usePDF hook (deprecated in React 19)
// Key={Date.now()} workaround for reconciler crash
<ResumePreviewContainer key={Date.now()} resume={resume} />
```

## Performance Optimization

### Debouncing (800ms)

```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    onChange(formData);
  }, 800);
  return () => clearTimeout(timeoutRef.current);
}, [formData]);
```

### Memoization

```typescript
const SECTION_ICONS = { EXPERIENCE: '💼', EDUCATION: '🎓' };
const handleEdit = useCallback((id) => navigate(`/edit/${id}`), [navigate]);
```

### Preview Scaling

| Screen Width     | Scale |
| ---------------- | ----- |
| Desktop (>794px) | 100%  |
| Tablet (~768px)  | ~93%  |
| Mobile (~375px)  | ~43%  |

## File Storage Policy

| Aspect     | Policy                                            |
| ---------- | ------------------------------------------------- |
| Storage    | Original color image only                         |
| Display    | Color default, CSS grayscale toggle available     |
| Location   | MinIO: `resumes/{userId}/{resumeId}/{uuid}.{ext}` |
| Temp Files | `tmp/{userId}/{uuid}.{ext}` (24h cleanup)         |

## Share Links

| Type           | Frontend Route   | Backend Endpoint                  |
| -------------- | ---------------- | --------------------------------- |
| Public profile | `/:username`     | `GET /v1/resume/public/:username` |
| Share link     | `/shared/:token` | `GET /v1/share/public/:token`     |

### Create Share Link

```
POST /v1/share/resume/:resumeId
```

Response:

```json
{
  "id": "share-uuid",
  "token": "share-token",
  "resumeId": "resume-uuid",
  "expiresAt": "2025-01-31T00:00:00Z"
}
```

Share URL: `https://domain/shared/${token}`

## DegreeType Enum

| Value       | Korean   | English          |
| ----------- | -------- | ---------------- |
| HIGH_SCHOOL | 고등학교 | High School      |
| ASSOCIATE_2 | 2년제    | 2-Year Associate |
| ASSOCIATE_3 | 3년제    | 3-Year Associate |
| BACHELOR    | 학사     | Bachelor's       |
| MASTER      | 석사     | Master's         |
| DOCTORATE   | 박사     | Doctorate        |

## Education Model

```typescript
interface Education {
  school: string; // required
  major: string; // required
  degree?: DegreeType; // optional
  startDate: string; // YYYY-MM
  endDate?: string; // null = currently enrolled
  gpa?: string;
  order: number; // drag-drop order
}
```

## Design Compliance

```tsx
// Use theme tokens (SSOT)
className = 'bg-theme-bg-card text-theme-text-primary rounded-soft';

// Follow 8pt grid
className = 'p-4 gap-4 mb-4'; // 16px
```

## File Locations

| Path                                             | Purpose                       |
| ------------------------------------------------ | ----------------------------- |
| `apps/web-main/src/components/resume/`           | Form, Preview, PDF components |
| `services/personal-service/src/resume/`          | API, Service, DTOs            |
| `services/personal-service/prisma/schema.prisma` | Database schema               |
| `.ai/resume.md`                                  | LLM reference documentation   |

## Changelog

| Date       | Changes                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 2025-12-26 | Removed birthYear, added PREFER_NOT_TO_SAY gender, extended SectionType, soft delete, UUIDv7 tokens |
| 2025-12-23 | Fixed PDF crash, added sanitizeText(), 800ms debounce                                               |
| 2025-11-20 | Added birthDate, gender fields                                                                      |
| 2025-11-19 | Paged.js integration, optimized margins                                                             |

---

**LLM Reference**: `docs/llm/guides/RESUME.md`
