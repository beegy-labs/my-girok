# Resume Feature Guide

> PDF resume creation with Korean market support

## Architecture

```
ResumeEditPage
├── ResumeForm (input)
│   ├── SectionOrderManager (drag-drop)
│   ├── ExperienceSection
│   ├── EducationSection
│   ├── SkillsSection
│   └── HierarchicalDescription (reusable, 4 depth)
└── ResumePreviewContainer
    └── ResumePdfDocument (@react-pdf/renderer)
```

## Data Flow

```
User Input → ResumeForm → onChange (800ms debounce) → PDF Preview
                ↓
            Save → API → personal-service → Database
```

## Section Types (8 sections)

| Type               | Icon | Korean     | Note                              |
| ------------------ | ---- | ---------- | --------------------------------- |
| BASIC_INFO         | -    | 기본정보   | Always first, not reorderable     |
| EXPERIENCE         | 💼   | 경력       | Company → Projects → Achievements |
| EDUCATION          | 🎓   | 학력       | Drag-and-drop, degree enum        |
| SKILLS             | ⚡   | 기술       | Category → Items → Descriptions   |
| CERTIFICATE        | 🏆   | 자격증     |                                   |
| KEY_ACHIEVEMENTS   | 🏅   | 핵심성과   | string[]                          |
| APPLICATION_REASON | 💡   | 지원동기   |                                   |
| COVER_LETTER       | 📝   | 자기소개서 |                                   |

## Korean Market Fields

| Field             | Type                | Purpose                             |
| ----------------- | ------------------- | ----------------------------------- |
| birthDate         | string (YYYY-MM-DD) | 만 나이 calculation                 |
| gender            | enum                | MALE, FEMALE, OTHER                 |
| militaryService   | enum                | COMPLETED, EXEMPTED, NOT_APPLICABLE |
| coverLetter       | string              | 자기소개서                          |
| applicationReason | string              | 지원 동기                           |
| keyAchievements   | string[]            | 주요 성과                           |

## Hierarchical Achievements (4 Depth)

```
• Depth 1 (Main achievement)
  ◦ Depth 2 (Sub-achievement)
    ▪ Depth 3 (Details)
      ▫ Depth 4 (Specific items)
```

Used in: Work Experience (achievements), Skills (descriptions)

## Print & PDF Configuration

### Paged.js Integration

```typescript
useEffect(() => {
  if (viewMode === 'paginated' && contentRef.current) {
    const paged = new Previewer();
    const pageSize = paperSize === 'A4' ? 'A4' : 'letter';

    const dynamicCSS = `
      @page {
        size: ${pageSize};
        margin: 0;
      }
      @media print {
        .resume-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;

    paged.preview(content, [dynamicCSS], container);
  }
}, [viewMode, resume, paperSize]);
```

### Print CSS Configuration

```css
@media print {
  /* Hide continuous view, show Paged.js */
  #resume-content {
    display: none !important;
  }
  .pagedjs-container {
    display: block !important;
  }

  /* Page constraints */
  .pagedjs_page,
  .pagedjs_page_content,
  .pagedjs_pagebox {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Text overflow prevention */
  a,
  span,
  p,
  div,
  li {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    hyphens: auto !important;
  }

  /* Media constraints */
  img,
  video,
  svg {
    max-width: 100% !important;
    height: auto !important;
  }
}
```

### Print Settings

| Setting             | Value                  |
| ------------------- | ---------------------- |
| Margins             | None                   |
| Headers/footers     | None                   |
| Background graphics | On                     |
| Paper Size          | A4 or Letter (dynamic) |

## PDF Export Functions

```typescript
exportResumeToPDF(); // Download PDF
generateResumePDFBlob(); // Get as Blob
generateResumePDFBase64(); // Get as base64
printResumePDF(); // Open print dialog
```

### Image Handling

Profile images require Base64 conversion for CORS bypass:

```typescript
const base64 = await imageToBase64(profileImageUrl);
```

## React 19 Compatibility

```typescript
// Use pdf() function instead of usePDF hook
// Avoids "Eo is not a function" error (#3164, #3187)

// Key={Date.now()} workaround for reconciler crash
<ResumePreviewContainer key={Date.now()} resume={resume} />
```

## Performance Patterns

### Form Debouncing (800ms)

```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    onChange(formData);
  }, 800);
  return () => clearTimeout(timeoutRef.current);
}, [formData]);
```

### Handler Memoization

```typescript
// Module-scope constants
const SECTION_ICONS = { EXPERIENCE: '💼', EDUCATION: '🎓', ... };

// Memoized handlers
const handleEdit = useCallback((id) => navigate(`/edit/${id}`), [navigate]);
const handleDelete = useCallback(async (id) => { ... }, [deleteResume]);
```

### Responsive Preview Scaling

```
Desktop (>794px): 100% original size
Tablet (~768px): Auto-scaled to ~93%
Mobile (~375px): Auto-scaled to ~43%
```

## File Storage

| Aspect   | Policy                                            |
| -------- | ------------------------------------------------- |
| Storage  | Original color image only                         |
| Display  | Color default, CSS grayscale toggle               |
| Location | MinIO: `resumes/{userId}/{resumeId}/{uuid}.{ext}` |
| Temp     | `tmp/{userId}/{uuid}.{ext}` (24-hour cleanup)     |

## Profile Photo Handling

### Display in Form

```tsx
{
  formData.profileImage && (
    <div className="mb-3 flex items-center gap-3">
      <img
        src={formData.profileImage}
        alt="Profile"
        className="w-24 h-24 object-cover rounded-full border-2 border-theme-border-default"
        onError={(e) => {
          // Fallback to placeholder SVG on error
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,...';
        }}
      />
      <button
        type="button"
        onClick={() => setFormData({ ...formData, profileImage: '' })}
        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        Remove Photo
      </button>
    </div>
  );
}
```

**Key Points:**

- Preview: 96x96px (`w-24 h-24`) circular with theme border
- Error handling: Fallback to SVG placeholder if URL fails
- Remove button: Clears profileImage field (red for destructive action)
- Grayscale toggle: CSS `filter: grayscale(100%)` via UI button

## Share Links

### URL Patterns

| Type           | Frontend Route   | Backend API                       |
| -------------- | ---------------- | --------------------------------- |
| Public profile | `/:username`     | `GET /v1/resume/public/:username` |
| Share link     | `/shared/:token` | `GET /v1/share/public/:token`     |

### Share Link Management

```typescript
// Create share link
POST /v1/share/resume/:resumeId
// Response: { id, token, resumeId, expiresAt, ... }

// Generated URL format
const shareUrl = `https://domain/shared/${token}`;
```

## Education Structure

### DegreeType Enum

| Value       | Korean   | English          |
| ----------- | -------- | ---------------- |
| HIGH_SCHOOL | 고등학교 | High School      |
| ASSOCIATE_2 | 2년제    | 2-Year Associate |
| ASSOCIATE_3 | 3년제    | 3-Year Associate |
| BACHELOR    | 학사     | Bachelor's       |
| MASTER      | 석사     | Master's         |
| DOCTORATE   | 박사     | Doctorate        |

### Education Model

```typescript
interface Education {
  school: string; // required
  major: string; // required
  degree?: DegreeType; // optional enum
  startDate: string; // YYYY-MM
  endDate?: string; // nullable = currently enrolled
  gpa?: string;
  order: number; // drag-and-drop order
}
```

## Design Compliance

```tsx
// Use theme tokens (SSOT)
className = 'bg-theme-bg-card text-theme-text-primary rounded-soft';

// 8pt grid spacing
className = 'p-4 gap-4 mb-4'; // ✅ 16px
className = 'p-3 gap-3 mb-3'; // ❌ 12px
```

## File Locations

| Path                                             | Purpose             |
| ------------------------------------------------ | ------------------- |
| `apps/web-main/src/components/resume/`           | Form, Preview, PDF  |
| `services/personal-service/src/resume/`          | API, Service, DTOs  |
| `services/personal-service/prisma/schema.prisma` | Database schema     |
| `.ai/resume.md`                                  | LLM quick reference |

## Changelog

### 2025-12-23

- Fixed PDF rendering crash (#321)
- Added `sanitizeText()` for emoji/Unicode removal
- Added 800ms debounce to ResumeForm

### 2025-11-20

- Added birthDate field (YYYY-MM-DD) for accurate age calculation
- Added gender field (MALE, FEMALE, OTHER)

### 2025-11-19

- Paged.js print integration
- Optimized margins (0.5cm)
- Multi-page PDF support

---

**LLM Quick Reference**: `.ai/resume.md`
