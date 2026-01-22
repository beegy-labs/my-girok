# Resume Implementation Details

> PDF export, React 19, performance, file storage, share links, and models

## PDF Export

```typescript
exportResumeToPDF(); // Download
generateResumePDFBlob(); // Blob
generateResumePDFBase64(); // Base64
printResumePDF(); // Print dialog
```

Image: Base64 conversion for CORS bypass

## React 19 Compatibility

```typescript
// Use pdf() function instead of usePDF hook
// Key={Date.now()} workaround for reconciler crash
<ResumePreviewContainer key={Date.now()} resume={resume} />
```

## Performance

### Debouncing (800ms)

```typescript
const timeoutRef = useRef<NodeJS.Timeout>();
useEffect(() => {
  timeoutRef.current = setTimeout(() => onChange(formData), 800);
  return () => clearTimeout(timeoutRef.current);
}, [formData]);
```

### Memoization

```typescript
const SECTION_ICONS = { EXPERIENCE: '💼', EDUCATION: '🎓' };
const handleEdit = useCallback((id) => navigate(`/edit/${id}`), [navigate]);
```

### Preview Scaling

| Screen           | Scale |
| ---------------- | ----- |
| Desktop (>794px) | 100%  |
| Tablet (~768px)  | ~93%  |
| Mobile (~375px)  | ~43%  |

## File Storage

| Aspect   | Policy                                            |
| -------- | ------------------------------------------------- |
| Storage  | Original color image only                         |
| Display  | Color default, CSS grayscale toggle               |
| Location | MinIO: `resumes/{userId}/{resumeId}/{uuid}.{ext}` |
| Temp     | `tmp/{userId}/{uuid}.{ext}` (24h cleanup)         |

## Share Links

| Type           | Frontend         | Backend                           |
| -------------- | ---------------- | --------------------------------- |
| Public profile | `/:username`     | `GET /v1/resume/public/:username` |
| Share link     | `/shared/:token` | `GET /v1/share/public/:token`     |

### Create Share Link

```
POST /v1/share/resume/:resumeId
-> { id, token, resumeId, expiresAt }
URL: https://domain/shared/${token}
```

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
  endDate?: string; // null = enrolled
  gpa?: string;
  order: number; // drag-drop order
}
```

## Design Compliance

```tsx
// Theme tokens (SSOT)
className = 'bg-theme-bg-card text-theme-text-primary rounded-soft';

// 8pt grid
className = 'p-4 gap-4 mb-4'; // 16px
```

## Changelog

| Date       | Changes                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2025-12-26 | Removed birthYear, added PREFER_NOT_TO_SAY, extended SectionType, soft delete, UUIDv7 tokens |
| 2025-12-23 | Fixed PDF crash, added sanitizeText(), 800ms debounce                                        |
| 2025-11-20 | Added birthDate, gender fields                                                               |
| 2025-11-19 | Paged.js integration, optimized margins                                                      |

---

_Main: `resume.md`_
