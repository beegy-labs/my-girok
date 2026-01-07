# Web Main (Extended)

Public React web application - Extended documentation

## Stack

| Component | Technology          |
| --------- | ------------------- |
| Framework | React 19.2 + Vite 7 |
| Router    | React Router v7     |
| Styling   | Tailwind CSS 4.1    |
| State     | Zustand 5.0         |
| Testing   | Vitest + Playwright |

## Resume PDF Architecture

```
ResumePdfDocument.tsx -> @react-pdf/renderer (generates)
ResumePreview.tsx     -> react-pdf (displays canvas)
ResumePreviewContainer -> Responsive wrapper + scale
```

### PDF i18n

```typescript
type PdfLocale = 'ko' | 'en' | 'ja';
<ResumePdfDocument resume={resume} paperSize="A4" locale="en" />
```

### Crash Prevention

```typescript
// Stable key prevents reconciler bug (#3153)
<ResumePreviewContainer key={`preview-${previewData.id || 'new'}`} />

// Safe resume wrapper
const safeResume = useMemo(() => ({
  ...resume,
  name: resume.name || '',
  skills: resume.skills || [],
}), [resume]);
```

### Text Sanitization

```typescript
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width
}
```

### Profile Image (CORS bypass)

```typescript
import { imageToBase64 } from '../../utils/imageProxy';
const [base64, setBase64] = useState<string | null>(null);
useEffect(() => {
  if (resume.profileImage) imageToBase64(resume.profileImage).then(setBase64);
}, [resume.profileImage]);
```

### ResumePreviewContainer Props

| Prop      | Type         | Default | Description |
| --------- | ------------ | ------- | ----------- |
| resume    | Resume       | req     | Data        |
| paperSize | PaperSizeKey | A4      | Paper size  |
| scale     | number       | auto    | Fixed scale |
| maxHeight | string       | -       | Max height  |

## Mobile Patterns

| Size | Height | Target          |
| ---- | ------ | --------------- |
| sm   | 36px   | Avoid on mobile |
| md   | 44px   | AA minimum      |
| lg   | 56px   | Recommended     |
| xl   | 64px   | Primary actions |

```typescript
// Touch sensor for drag-drop
useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
```

## Hooks

### useResumeViewer

```typescript
const { data, loading, error, retry } = useResumeViewer({
  fetchFn: () => getResume(resumeId),
  deps: [resumeId],
  skip: !resumeId,
  errorMapper: (err) => (err.response?.status === 404 ? 'NOT_FOUND' : 'UNKNOWN'),
});

// Error types: NOT_FOUND, EXPIRED, INACTIVE, NETWORK, UNKNOWN
```

## Performance (MANDATORY)

```typescript
// Memoize handlers
const handleSubmit = useCallback(async (data) => { ... }, [deps]);

// Memoize computed
const sorted = useMemo(() => items.sort(), [items]);

// Static constants outside component
const LANGUAGES = [{ code: 'ko' }] as const;
```

## Environment

```bash
VITE_API_URL=https://auth.girok.dev
VITE_PERSONAL_API_URL=https://my.girok.dev
```

## Commands

```bash
pnpm --filter web-main dev    # Start
pnpm --filter web-main build  # Build
pnpm --filter web-main test   # Test
```
