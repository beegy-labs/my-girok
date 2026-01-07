# Web Main Application

> Public-facing web application for My-Girok platform

## Tech Stack

| Technology   | Version | Purpose          |
| ------------ | ------- | ---------------- |
| React        | 19.2    | UI Framework     |
| Vite         | 7.2     | Build Tool       |
| TypeScript   | 5.9     | Type Safety      |
| React Router | v7      | Routing          |
| Tailwind CSS | 4.1     | Styling          |
| Zustand      | 5.0     | State Management |
| Axios        | 1.13    | HTTP Client      |

## Project Structure

```
apps/web-main/src/
  layouts/          # Layout components
    AuthLayout.tsx      # Authentication pages layout
    LegalPageLayout.tsx # Legal document pages
    MainLayout.tsx      # Main app layout with Navbar

  pages/            # Route pages
    resume/             # Resume-related pages

  components/       # Shared components
    Navbar.tsx          # Navigation bar
    Footer.tsx          # Footer component
    resume/             # Resume components

  api/              # API clients
    auth.ts             # Authentication API
    resume.ts           # Resume API
    legal.ts            # Legal API

  stores/           # Zustand stores
    authStore.ts        # Authentication state
    userPreferencesStore.ts # User preferences

  hooks/            # Custom hooks
    useResumeViewer.ts  # Resume viewer logic

  utils/            # Utility functions
    pdf.ts              # PDF utilities
    imageProxy.ts       # Image proxy helper

  i18n/             # Internationalization
    config.ts           # i18n configuration
```

## Routes

| Path                  | Auth      | Description              |
| --------------------- | --------- | ------------------------ |
| `/`                   | Public    | Landing page / Dashboard |
| `/login`              | Public    | Login page               |
| `/register`           | Public    | Registration page        |
| `/resume/:username`   | Public    | Public resume view       |
| `/shared/:token`      | Public    | Shared resume via token  |
| `/resume/my`          | Protected | User's resume list       |
| `/resume/edit/:id`    | Protected | Resume editor            |
| `/resume/preview/:id` | Protected | Print preview            |
| `/settings`           | Protected | User settings            |

## Design System (WCAG 2.1 AAA)

### Typography

```css
/* Title - Editorial Style */
font-serif-title tracking-editorial italic text-5xl

/* Brand - Monospace */
font-mono-brand tracking-brand uppercase text-[11px]
```

### Components

```css
/* Card */
rounded-soft border-2 p-10 md:p-14

/* Input */
h-16 rounded-soft

/* Button */
min-h-[64px] font-black uppercase tracking-brand
```

### Layout Pattern

```tsx
// Footer as sibling of main, not child
<>
  <main className="min-h-screen pt-nav">{/* Page Content */}</main>
  <Footer />
</>
```

## API Architecture

### Axios Instances

```typescript
// Public API - No 401 interceptor
export const publicApi = axios.create({ baseURL: API_URL });

// Auth API - With 401 interceptor for token refresh
export const authApi = axios.create({ baseURL: API_URL });
```

### Token Storage

| Token         | Storage         | Purpose            |
| ------------- | --------------- | ------------------ |
| Access Token  | localStorage    | API authentication |
| Refresh Token | HttpOnly Cookie | Token refresh      |

## Performance Best Practices

### Memoization

```typescript
// Memoize event handlers
const handleSubmit = useCallback(
  async (data) => {
    await submitForm(data);
  },
  [submitForm],
);

// Memoize computations
const filteredItems = useMemo(() => items.filter((item) => item.active), [items]);
```

### Static Constants

```typescript
// Define outside component to prevent recreation
const LANGUAGES = [
  { code: 'ko', label: 'Korean' },
  { code: 'en', label: 'English' },
] as const;
```

### Navigation

```typescript
// Direct navigation after async operations
await login(credentials);
navigate('/'); // No state-based navigation
```

### i18n with Fallback

```tsx
// Always provide defaultValue for missing keys
{
  t('auth.createArchive', { defaultValue: 'Create Your Archive' });
}
```

## Resume PDF System

| Component              | Library             | Purpose                            |
| ---------------------- | ------------------- | ---------------------------------- |
| ResumePdfDocument      | @react-pdf/renderer | Generate PDF                       |
| ResumePreview          | react-pdf           | Display PDF                        |
| ResumePreviewContainer | -                   | Responsive wrapper with auto-scale |

### PDF Best Practices

```typescript
// Filter empty values before rendering
{items
  .filter(item => item?.trim())
  .map(item => <Text key={item}>{sanitizeText(item)}</Text>)
}

// Use stable keys to prevent reconciler crash
<ResumePreviewContainer
  key={`preview-${resume.id}`}
  resume={resume}
/>
```

## Environment Variables

```bash
# API URLs
VITE_API_URL=https://auth.girok.dev
VITE_PERSONAL_API_URL=https://my.girok.dev
```

## Commands

```bash
# Development
pnpm --filter web-main dev

# Build for production
pnpm --filter web-main build

# Run tests
pnpm --filter web-main test
```

---

**LLM Reference**: `docs/llm/apps/web-main.md`
