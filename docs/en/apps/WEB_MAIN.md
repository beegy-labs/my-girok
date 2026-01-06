# Web Main

> Public React web application for My-Girok

## Tech Stack

| Component | Technology                   |
| --------- | ---------------------------- |
| Framework | React 19.2 + Vite 7.2        |
| Router    | React Router v7              |
| Language  | TypeScript 5.9               |
| Styling   | Tailwind CSS 4.1             |
| State     | Zustand 5.0                  |
| Testing   | Vitest 4.0 + Playwright 1.57 |

## Project Structure

```
apps/web-main/src/
├── layouts/          # MainLayout, AuthLayout, LegalPageLayout
├── pages/            # Route pages (HomePage, LoginPage, resume/*)
├── components/       # Navbar, Footer, resume/*
├── api/              # auth.ts, resume.ts, legal.ts
├── stores/           # authStore, userPreferencesStore
├── hooks/            # useResumeViewer
├── utils/            # pdf.ts, imageProxy.ts
└── i18n/             # config.ts
```

## Routes

### Public

| Path                | Description                       |
| ------------------- | --------------------------------- |
| `/`                 | Landing/Dashboard                 |
| `/login`            | Login                             |
| `/register`         | Register                          |
| `/consent`          | Legal consent before registration |
| `/resume/:username` | Public resume                     |
| `/shared/:token`    | Shared resume                     |

### Protected

| Path                  | Description   |
| --------------------- | ------------- |
| `/resume/my`          | Resume list   |
| `/resume/edit/:id`    | Resume editor |
| `/resume/preview/:id` | Print preview |
| `/settings`           | User settings |

## Design System

### Color Tokens

Use semantic theme tokens:

```tsx
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
```

### 8pt Grid System

| Allowed | Value | Disallowed |
| ------- | ----- | ---------- |
| `p-2`   | 8px   | `p-3`      |
| `p-4`   | 16px  | `p-5`      |
| `gap-2` | 8px   | `gap-3`    |
| `gap-4` | 16px  | `gap-5`    |

---

## Resume PDF & Preview

### Architecture

```
ResumePdfDocument.tsx    → @react-pdf/renderer (generates PDF)
        ↓
ResumePreview.tsx        → react-pdf (displays PDF in canvas)
        ↓
ResumePreviewContainer   → Responsive wrapper with scale
```

### Key Files

| File                         | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `ResumePdfDocument.tsx`      | PDF document using @react-pdf/renderer |
| `ResumePreview.tsx`          | PDF viewer using react-pdf             |
| `ResumePreviewContainer.tsx` | Responsive container with auto-scale   |
| `utils/pdf.ts`               | PDF export utilities                   |

### PDF i18n Support

```typescript
import ResumePdfDocument, { PdfLocale } from './ResumePdfDocument';

type PdfLocale = 'ko' | 'en' | 'ja';

<ResumePdfDocument
  resume={resume}
  paperSize="A4"
  locale="en"
/>
```

**Locale-specific translations:**

- Section titles (Skills, Experience, Education)
- Labels (Email, Phone, Present, Ongoing)
- Duration format (1년 2개월 / 1 yrs 2 mos / 1年2ヶ月)

### PDF Rendering Crash Prevention

**@react-pdf/renderer Reconciler Bug Workaround** ([#3153](https://github.com/diegomura/react-pdf/issues/3153)):

```typescript
// ResumeEditPage.tsx - Stable key based on resume ID
<ResumePreviewContainer
  key={`preview-${previewData.id || 'new'}`}
  resume={previewData}
/>

// ResumePreview.tsx - safeResume wrapper handles empty values
const safeResume = useMemo(() => ({
  ...resume,
  name: resume.name || '',
  applicationReason: resume.applicationReason || '',
  skills: resume.skills || [],
  experiences: resume.experiences || [],
}), [resume]);
```

### Text Sanitization

Emojis and special Unicode characters crash PDF font rendering:

```typescript
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
    .replace(/[\u200B-\u200D\uFEFF]/g, '');  // Zero-width chars
}

<Text>{sanitizeText(resume.applicationReason)}</Text>
```

### Profile Image Base64 Conversion

Avoids CORS issues in PDF generation:

```typescript
import { imageToBase64 } from '../../utils/imageProxy';

const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);

useEffect(() => {
  if (resume.profileImage) {
    imageToBase64(resume.profileImage).then(setProfileImageBase64);
  }
}, [resume.profileImage]);

<ResumePdfDocument profileImageBase64={profileImageBase64} />
```

### PDF Export Functions

```typescript
import { exportResumeToPDF, generateResumePDFBlob } from '../../utils/pdf';

// Download PDF
await exportResumeToPDF(resume, { paperSize: 'A4', fileName: 'resume.pdf' });

// Generate blob (for upload)
const blob = await generateResumePDFBlob(resume, { paperSize: 'A4' });
```

### ResumePreviewContainer Component

**Props:**

| Prop        | Type           | Default  | Description          |
| ----------- | -------------- | -------- | -------------------- |
| `resume`    | `Resume`       | required | Resume data          |
| `paperSize` | `PaperSizeKey` | `'A4'`   | Paper size           |
| `scale`     | `number`       | auto     | Fixed scale          |
| `maxHeight` | `string`       | -        | Max container height |

**Responsive Design Policy:**

- Full responsive scaling to fit container width
- No minimum scale (mobile ~47%, tablet ~93%, desktop 100%)
- No horizontal overflow
- Pinch-to-zoom on mobile
- Export always full-resolution vector PDF

### High-Quality Rendering

```typescript
// Cap at 2 to balance quality and performance
const devicePixelRatio = Math.min(2, window.devicePixelRatio || 1);

<Page
  pageNumber={currentPage}
  width={displayWidth}
  devicePixelRatio={devicePixelRatio}
/>
```

---

## Mobile Design Patterns

### Core Design Tokens

```tsx
// Mobile-first patterns
<Button size="lg" className="w-full min-h-touch-aa">  // 44px minimum
<TextInput size="lg" className="min-h-input" />        // 48px AAA
```

### Button Size Standards

| Size | Height | Touch Target       |
| ---- | ------ | ------------------ |
| sm   | 36px   | ❌ Avoid on mobile |
| md   | 44px   | ✅ AA minimum      |
| lg   | 56px   | ✅ Recommended     |
| xl   | 64px   | ✅ Primary actions |

### TouchSensor for Drag-and-Drop

```typescript
import { useSensor, useSensors, TouchSensor, MouseSensor } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // 200ms hold to activate
      tolerance: 5, // 5px movement allowed
    },
  }),
  useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  }),
);
```

### Collapsible Cards on Mobile

```typescript
const [expanded, setExpanded] = useState(!isMobile);

<Card>
  <CardHeader onClick={() => setExpanded(!expanded)}>
    <span>{title}</span>
    <ChevronDown className={expanded ? 'rotate-180' : ''} />
  </CardHeader>
  {expanded && <CardContent>{children}</CardContent>}
</Card>
```

---

## React 2025 Best Practices

### Memoization Pattern (MANDATORY)

```typescript
// ✅ DO - Memoize event handlers
const handleSubmit = useCallback(async (data: FormData) => {
  await createResume(data);
  navigate('/resume/my');
}, [navigate]);

// ✅ DO - Memoize computed values
const sortedItems = useMemo(() =>
  items.slice().sort((a, b) => a.order - b.order), [items]);

// ✅ DO - Memoize list item components
const MenuItem = memo(function MenuItem({ item, onClick }: Props) {
  return <div onClick={onClick}>{item.name}</div>;
});
```

### Static Constants Outside Component

```typescript
// ✅ DO - Module scope constants (created once)
const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
] as const;

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
} as const;

export default function Component() {
  const current = LANGUAGES.find((lang) => lang.code === code);
}

// ❌ DON'T - Inside component (recreated every render)
export default function Component() {
  const languages = [{ code: 'ko', label: '한국어' }];
}
```

### useCallback Pattern for useEffect Dependencies

```typescript
// ✅ ESLint-safe: onChange is stable via useCallback in parent
useEffect(() => {
  const timer = setTimeout(() => onChange(formData), 800);
  return () => clearTimeout(timer);
}, [formData, onChange]);

// Parent component
const handleFormChange = useCallback((data: ResumeFormData) => {
  setPreviewData(data);
}, []);
```

---

## Custom Hooks

### useResumeViewer

Generic hook for Resume viewer pages:

```typescript
export enum ResumeViewerError {
  NOT_FOUND = 'NOT_FOUND',
  EXPIRED = 'EXPIRED',
  INACTIVE = 'INACTIVE',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

export interface UseResumeViewerResult<T> {
  data: T | null;
  loading: boolean;
  error: ResumeViewerError | null;
  retry: () => void;
}

// Usage
const {
  data: resume,
  loading,
  error,
  retry,
} = useResumeViewer({
  fetchFn: () => getResume(resumeId!),
  deps: [resumeId],
  skip: !resumeId,
  errorMapper: (err) => {
    if (err.response?.status === 404) return ResumeViewerError.NOT_FOUND;
    return ResumeViewerError.UNKNOWN;
  },
});
```

**Used By:** ResumePreviewPage, SharedResumePage, PublicResumePage

---

## ESLint Configuration

### react-hooks Plugin

```javascript
// .eslintrc.js
{
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
}
```

### Unused Variables Pattern

```typescript
// Prefix with underscore to indicate intentionally unused
const { unusedField: _unusedField, ...rest } = data;

// Destructure and ignore specific fields
const { _id, _createdAt, ...cleanData } = apiResponse;
```

---

## Environment Variables

```bash
VITE_API_URL=https://auth.girok.dev
VITE_PERSONAL_API_URL=https://my.girok.dev
```

## Development

```bash
pnpm --filter web-main dev      # Start
pnpm --filter web-main build    # Build
pnpm --filter web-main test     # Test
```

---

**LLM Reference**: [.ai/apps/web-main.md](../../.ai/apps/web-main.md)
