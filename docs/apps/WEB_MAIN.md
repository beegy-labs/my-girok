# Web Main

> Public React web application for My-Girok

## Tech Stack

| Component | Technology            |
| --------- | --------------------- |
| Framework | React 19.2 + Vite 7.2 |
| Router    | React Router v7       |
| Language  | TypeScript 5.9        |
| Styling   | Tailwind CSS 4.1      |
| State     | Zustand 5.0           |

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

| Path                | Description       |
| ------------------- | ----------------- |
| `/`                 | Landing/Dashboard |
| `/login`            | Login             |
| `/register`         | Register          |
| `/resume/:username` | Public resume     |
| `/shared/:token`    | Shared resume     |

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

## Best Practices

### Memoization (Mandatory)

```typescript
const handleSubmit = useCallback(async (e) => { ... }, [deps]);
const filteredItems = useMemo(() => items.filter(...), [items]);
```

### Static Constants

```typescript
// Outside component
const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
] as const;
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

**LLM Reference**: [.ai/apps/web-main.md](../../.ai/apps/web-main.md)
