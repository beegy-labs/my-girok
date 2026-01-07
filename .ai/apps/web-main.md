# Web Main App

> Public-facing web application for My-Girok | **Last Updated**: 2026-01-06

## Tech Stack

- **Framework**: React 19.2 + Vite 7.2
- **Router**: React Router v7
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4.1 (Vite plugin)
- **State**: Zustand 5.0
- **API**: Axios 1.13

## Design System: V0.0.1 AAA Workstation

> WCAG 2.1 AAA compliant editorial design

### Key Visual Patterns

| Element     | SSOT Classes                                           |
| ----------- | ------------------------------------------------------ |
| Title font  | `font-serif-title tracking-editorial italic text-5xl`  |
| Brand label | `font-mono-brand tracking-brand uppercase text-[11px]` |
| Form card   | `rounded-soft border-2 p-10 md:p-14`                   |
| Input (lg)  | `h-16 rounded-soft`                                    |
| Button (xl) | `min-h-[64px] font-black uppercase tracking-brand`     |

### Layout Pattern (HTML5 Semantic)

```tsx
// ✅ CORRECT
<>
  <main className="min-h-screen pt-nav">{/* Content */}</main>
  <Footer />
</>

// ❌ WRONG: Footer inside main
<main>
  <div>Content</div>
  <Footer />
</main>
```

**Rules:**

- One `<main>` per page as root
- `<Footer>` must be sibling of `<main>`, not child

## Structure

```
apps/web-main/src/
├── layouts/         # AuthLayout, LegalPageLayout, MainLayout
├── pages/           # Route pages
│   └── resume/      # MyResumePage, ResumeEditPage, etc.
├── components/      # Navbar, Footer, resume/*
├── api/             # auth.ts, resume.ts, legal.ts
├── stores/          # authStore, userPreferencesStore
├── hooks/           # useResumeViewer
├── utils/           # pdf.ts, imageProxy.ts
└── i18n/            # config.ts
```

## Key Routes

### Public

| Path                  | Description       |
| --------------------- | ----------------- |
| `/`                   | Landing/Dashboard |
| `/login`, `/register` | Auth pages        |
| `/resume/:username`   | Public resume     |
| `/shared/:token`      | Shared resume     |

### Protected

| Path                  | Description   |
| --------------------- | ------------- |
| `/resume/my`          | Resume list   |
| `/resume/edit/:id`    | Resume editor |
| `/resume/preview/:id` | Print preview |
| `/settings`           | User settings |

## API Client Pattern

```typescript
// Two axios instances
export const publicApi = axios.create({ baseURL: API_URL }); // No 401 interceptor
export const authApi = axios.create({ baseURL: API_URL }); // Has 401 interceptor

// Why separate?
// login() uses publicApi - 401 = invalid credentials, show error
// getCurrentUser() uses authApi - 401 = token expired, auto-refresh
```

### Request Interceptor

```typescript
personalApi.interceptors.request.use(async (config) => {
  // Skip auth for public endpoints
  if (config.url?.includes('/share/public/')) return config;

  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
```

## Auth Pattern

### Token Storage

- **Access Token**: localStorage
- **Refresh Token**: HttpOnly cookie

### Auth Store (Zustand)

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}
```

## Performance Patterns

### Memoization (MANDATORY)

```typescript
// ✅ DO - Memoize handlers
const handleSubmit = useCallback(
  async (data) => {
    await createResume(data);
    navigate('/resume/my');
  },
  [navigate],
);

// ✅ DO - Memoize expensive computations
const filteredItems = useMemo(() => items.filter((item) => item.active), [items]);
```

### Static Constants (MANDATORY)

```typescript
// ✅ Outside component - created once
const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
] as const;

// ❌ Inside component - recreated every render
function Component() {
  const languages = [{ code: 'ko', label: '한국어' }];
}
```

### i18n Pattern

```typescript
// ✅ DO - Use t() with defaultValue
<p>{t('auth.createArchive', { defaultValue: 'Create Your Archive' })}</p>

// ❌ DON'T - Hardcoded strings
<p>Create Your Archive</p>
```

### Direct Navigation

```typescript
// ✅ DO - Direct navigation
await login(credentials);
navigate('/');

// ❌ DON'T - State-based navigation
const [shouldNavigate, setShouldNavigate] = useState(false);
useEffect(() => {
  if (shouldNavigate) navigate('/');
}, [shouldNavigate]);
```

## Resume PDF

### Architecture

```
ResumePdfDocument.tsx    → @react-pdf/renderer (generates PDF)
ResumePreview.tsx        → react-pdf (displays PDF)
ResumePreviewContainer   → Responsive wrapper with auto-scale
```

### Key Points

- **Empty Value Filtering**: Filter before rendering arrays
- **Text Sanitization**: Remove emojis with `sanitizeText()`
- **Base64 Images**: Convert profile images for CORS bypass
- **Stable Keys**: Use `key={resume.id}` to prevent reconciler crash

```typescript
// ✅ Filter empty values
{items.filter(item => item?.trim()).map(item => <Text>{item}</Text>)}

// ✅ Sanitize text for PDF
<Text>{sanitizeText(resume.applicationReason)}</Text>
```

## Error Handling

### ErrorBoundary

```tsx
<ErrorBoundary>
  <RouterProvider router={router} />
</ErrorBoundary>
```

### API Error

```typescript
try {
  await createResume(data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    setError(error.response?.data?.message || 'Unknown error');
  }
}
```

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

**SSOT**: `docs/llm/apps/web-main.md` | **Full docs**: `docs/en/apps/web-main.md`
