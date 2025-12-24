# Web Main App

> Public-facing web application - V0.0.1 AAA Workstation

## Tech Stack

- **Framework**: React 19.2 + Vite 7.2
- **Router**: React Router v7
- **Styling**: Tailwind CSS 4.1
- **State**: Zustand 5.0

## Structure

```
apps/web-main/src/
├── layouts/        # MainLayout, AuthLayout, LegalPageLayout
├── pages/          # Route pages
├── components/     # UI components
├── api/            # auth.ts, resume.ts, legal.ts
├── stores/         # authStore, userPreferencesStore
├── hooks/          # useResumeViewer
├── utils/          # pdf.ts, imageProxy.ts, localeConfig.ts
└── i18n/           # config.ts
```

## Routes

### Public

- `/` - HomePage (landing/dashboard)
- `/login`, `/register`, `/consent`
- `/resume/:username` - Public resume
- `/shared/:token` - Shared resume

### Protected

- `/resume/my` - Resume list
- `/resume/edit/:resumeId` - Editor
- `/resume/preview/:resumeId` - Preview
- `/settings`

## Design System (V0.0.1)

### Key Classes (SSOT)

| Element     | Classes                                               |
| ----------- | ----------------------------------------------------- |
| Title       | `font-serif-title tracking-editorial italic text-5xl` |
| Card        | `rounded-editorial-lg border-2 p-10`                  |
| Button (xl) | `min-h-[64px] font-black uppercase tracking-brand`    |

### Theme Tokens

```tsx
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
```

### 8pt Grid (MANDATORY)

| Allowed             | Value       | Disallowed       |
| ------------------- | ----------- | ---------------- |
| `p-2`, `p-4`, `p-6` | 8, 16, 24px | `p-3`, `p-5`     |
| `gap-2`, `gap-4`    | 8, 16px     | `gap-3`, `gap-5` |

## API Clients

```typescript
// publicApi - No 401 interceptor (login, register)
// authApi - Has 401 interceptor with token refresh
// personalApi - Resume API with auth

import { publicApi, authApi } from '../api/auth';
import { personalApi } from '../api/resume';
```

## Auth Pattern

```typescript
// Token storage
// Access: localStorage
// Refresh: HttpOnly cookie

// PrivateRoute usage
<PrivateRoute>
  <MyResumePage />
</PrivateRoute>
```

## Resume PDF

### Architecture

```
ResumePdfDocument (@react-pdf/renderer)
    ↓
ResumePreview (react-pdf viewer)
    ↓
ResumePreviewContainer (responsive wrapper)
```

### Crash Prevention

```typescript
// 1. Stable key
<ResumePreviewContainer key={`preview-${resume.id}`} />

// 2. safeResume wrapper (default all undefined fields)
const safeResume = useMemo(() => ({ ...resume, name: resume.name || '' }), [resume]);

// 3. sanitizeText (remove emojis for PDF fonts)
<Text>{sanitizeText(resume.applicationReason)}</Text>

// 4. imageToBase64 (CORS bypass)
const base64 = await imageToBase64(resume.profileImage);
```

## Best Practices (MANDATORY)

### Memoization

```typescript
// All handlers
const handleSubmit = useCallback(async (e) => { ... }, [deps]);

// All derived data
const filtered = useMemo(() => items.filter(...), [items]);
```

### Static Constants Outside Component

```typescript
// ✅ Outside component
const LANGUAGES = [{ code: 'ko', label: '한국어' }] as const;

export default function Component() { ... }
```

### i18n Pattern

```typescript
// Always use t() with defaultValue
{
  t('auth.login', { defaultValue: 'Login' });
}
```

### ESLint

```typescript
// NEVER disable react-hooks/exhaustive-deps
// Use useCallback instead

// Unused variables: prefix with _
catch (_err) { setError('...'); }
```

## Mobile Design

| Element       | Mobile      | Tablet       | Desktop      |
| ------------- | ----------- | ------------ | ------------ |
| Card padding  | `p-3`       | `sm:p-4`     | `lg:p-6`     |
| Section title | `text-base` | `sm:text-lg` | `lg:text-xl` |
| Body text     | `text-xs`   | `sm:text-sm` | -            |

## Environment

```bash
VITE_API_URL=https://auth.girok.dev
VITE_PERSONAL_API_URL=https://my.girok.dev
```

## Commands

```bash
pnpm --filter web-main dev     # Development
pnpm --filter web-main build   # Build
pnpm --filter web-main test    # Test
```

---

**Human docs**: [docs/apps/WEB_MAIN.md](../../docs/apps/WEB_MAIN.md)
