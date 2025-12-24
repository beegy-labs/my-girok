# Resume Feature Guide

> PDF resume creation with Korean market support

## Architecture

```
ResumeEditPage
├── ResumeForm (input)
│   ├── SectionOrderManager (drag-drop)
│   ├── ExperienceSection
│   └── SkillsSection
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

| Type               | Icon | Korean     |
| ------------------ | ---- | ---------- |
| EXPERIENCE         | 💼   | 경력       |
| EDUCATION          | 🎓   | 학력       |
| SKILLS             | ⚡   | 기술       |
| CERTIFICATE        | 🏆   | 자격증     |
| KEY_ACHIEVEMENTS   | 🏅   | 핵심성과   |
| APPLICATION_REASON | 💡   | 지원동기   |
| ATTACHMENTS        | 📎   | 첨부파일   |
| COVER_LETTER       | 📝   | 자기소개서 |

**Note:** BASIC_INFO is always first, not reorderable.

## Korean Market Fields

| Field             | Purpose                           |
| ----------------- | --------------------------------- |
| birthDate         | "1994 (30세)" format              |
| militaryService   | COMPLETED/EXEMPTED/NOT_APPLICABLE |
| applicationReason | 지원동기                          |
| coverLetter       | 자기소개서                        |

## PDF Export Functions

```typescript
exportResumeToPDF(); // Download PDF
generateResumePDFBlob(); // Get as Blob
generateResumePDFBase64(); // Get as base64
printResumePDF(); // Open print dialog
```

**Image handling:** Base64 conversion via `imageToBase64()` for CORS bypass.

## React 19 Compatibility

```typescript
// Use pdf() function instead of usePDF hook
// Avoids "Eo is not a function" error (#3164, #3187)
```

## Design Compliance

```tsx
// Use theme tokens (SSOT)
className = 'bg-theme-bg-card text-theme-text-primary rounded-soft';

// 8pt grid spacing
className = 'p-4 gap-4 mb-4'; // ✅ 16px
className = 'p-3 gap-3 mb-3'; // ❌ 12px
```

## Performance

```typescript
// Module-scope constants
const SECTION_ICONS = { ... };  // Outside component

// Memoized handlers
const handleClick = useCallback(() => {}, [deps]);

// 800ms debounce on form changes
useEffect(() => {
  const timeout = setTimeout(() => onChange(data), 800);
  return () => clearTimeout(timeout);
}, [data]);
```

## File Locations

| Path                                    | Purpose             |
| --------------------------------------- | ------------------- |
| `apps/web-main/src/components/resume/`  | Form, Preview, PDF  |
| `services/personal-service/src/resume/` | API, Service, DTOs  |
| `.ai/resume.md`                         | LLM quick reference |

---

**Quick reference**: `.ai/resume.md`
