# Core Development Rules

> **Essential rules for AI assistants working on my-girok**

## Language Policy (CRITICAL)

**ALL code, documentation, and commits MUST be in English**

- Code comments: English
- Commit messages: English
- Documentation: English
- API responses: English

## Architecture Rules

### NEVER

- ❌ Duplicate types → Use `packages/types`
- ❌ Duplicate NestJS utilities → Use `@my-girok/nest-common`
- ❌ Duplicate UI components → Use `@my-girok/ui-components`
- ❌ Implement inline forms without validation → Use shared components
- ❌ Implement drag-and-drop from scratch → Use `SortableList`
- ❌ Duplicate async/loading patterns → Use `useAsyncOperation`
- ❌ Return inconsistent error formats → Use `HttpExceptionFilter`
- ❌ Prisma in Controllers → Use Services
- ❌ Hardcode secrets → Use ConfigService
- ❌ Make sync service-to-service calls → Use HTTP
- ❌ Skip async/await
- ❌ Omit error handling
- ❌ Remove Rybbit analytics script
- ❌ Write non-English documentation
- ❌ Tightly couple services
- ❌ Commit secrets to git
- ❌ Log sensitive data (passwords, tokens)
- ❌ Store plain text K8s Secrets in Git
- ❌ **Inline functions in map()** → Use useCallback
- ❌ **Objects/arrays inside render** → Use useMemo
- ❌ **State for navigation** → Call navigate() directly
- ❌ **Functions in useEffect deps** → Memoize parent
- ❌ **Nested `<main>` tags** → One `<main>` per page only
- ❌ **Footer inside `<main>`** → Footer must be sibling of main
- ❌ **`<main>` in Layout components** → Pages own their `<main>` element

### ALWAYS

- ✅ Define types first in `packages/types`
- ✅ Use `@my-girok/nest-common` for backend services (decorators, guards, filters)
- ✅ Use `@my-girok/ui-components` for frontend UI (TextInput, Button, Alert, etc.)
- ✅ Use standard error format (`ApiErrorResponse` / `ApiSuccessResponse`)
- ✅ Use `configureApp()` factory for NestJS bootstrapping
- ✅ Use DTO validation (class-validator)
- ✅ Apply `@Transactional()` for multi-step DB ops
- ✅ Use Guards for protected endpoints
- ✅ Prevent N+1 queries (Prisma include/select)
- ✅ Paginate large queries
- ✅ Include Rybbit in Root Layouts
- ✅ Write tests (80% coverage minimum)
- ✅ Follow git commit conventions
- ✅ Create PRs for code review
- ✅ Use Sealed Secrets for K8s
- ✅ **Memoize handlers** with useCallback
- ✅ **Memoize constants** with useMemo
- ✅ **Use React.memo** for list items
- ✅ **Target <16ms** render time

## Transaction Pattern

```typescript
// ✅ DO
@Transactional()
async create(dto: CreatePostDto) {
  await this.postsRepo.create(dto);
  await this.tagsRepo.connect(post.id, dto.tags);
  // Auto rollback on error
}

// ❌ DON'T
async create(dto: CreatePostDto) {
  const post = await this.postsRepo.create(dto);
  await this.tagsRepo.connect(post.id, dto.tags);
  // No transaction, inconsistent state on error
}
```

## Query Optimization

```typescript
// ❌ DON'T: N+1
const posts = await prisma.post.findMany();
for (const post of posts) {
  post.author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ DO: Include
const posts = await prisma.post.findMany({
  include: { author: true },
});

// ✅ BETTER: Select only needed
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: { select: { id: true, name: true } },
  },
});
```

## Authentication

**Multi-provider Strategy Pattern:**

- JWT tokens: Access (15min) + Refresh (7days)
- Web: HttpOnly cookies + localStorage
- iOS: Keychain
- Android: EncryptedSharedPreferences

## Security

**Secrets Management:**

- Production: Sealed Secrets or External Secrets Operator
- Never commit plain secrets
- Rotate JWT secrets every 90 days

**Input Validation:**

- Always use class-validator DTOs
- Validate file uploads (type, size)
- Sanitize HTML (DOMPurify)

**Crawler/Bot Control (2025 Best Practices):**

| Layer         | Method              | Location                    |
| ------------- | ------------------- | --------------------------- |
| Web (nginx)   | robots.txt          | `nginx.conf` location block |
| API (Gateway) | X-Robots-Tag header | Cilium Gateway HTTPRoute    |

- ✅ Allow search engines (Googlebot, Bingbot)
- ❌ Block AI training crawlers:
  - OpenAI: GPTBot, ChatGPT-User
  - Anthropic: ClaudeBot, anthropic-ai, Claude-Web
  - Perplexity: PerplexityBot
  - Common Crawl: CCBot
  - Apple: Applebot-Extended
  - Meta: FacebookBot
  - ByteDance: Bytespider
  - Amazon: Amazonbot
  - Cohere: cohere-ai
- API returns `X-Robots-Tag: noindex, nofollow` header
- Review quarterly for new AI crawlers

**CORS for Mobile Browsers:**

```typescript
// ✅ REQUIRED: iOS Safari compatibility
app.enableCors({
  origin: [...],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 3600, // CRITICAL: Cache preflight for 1 hour
  optionsSuccessStatus: 204,
});
```

- iOS Safari requires explicit headers (no wildcards)
- `maxAge` prevents duplicate OPTIONS requests
- Without `maxAge`, Safari sends OPTIONS on every request (50% overhead)

## Testing

**Coverage Requirements:**

- Unit tests: 80% minimum
- Integration tests: All critical flows
- E2E tests: Main user journeys

**Mobile Browser Testing:**

- ✅ Test authenticated endpoints on iOS Safari (real device)
- ✅ Test authenticated endpoints on Android Chrome (real device)
- ✅ Verify CORS preflight caching with Network Inspector
- ✅ Test in Private Browsing mode (iOS Safari)
- ✅ Check for QuotaExceededError in console
- Use Safari Web Inspector or Chrome Remote Debugging

## Git Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, refactor, docs, test, chore, perf

**Example:**

```
feat(auth): add Google OAuth provider

Implement Google OAuth 2.0 authentication strategy.
Users can now login with their Google accounts.

Closes #123
```

## Deployment

**Environment Strategy:**

- Local dev: Docker Compose
- Staging/Production: Kubernetes only
- Use Kustomize for overlays
- Sealed Secrets for sensitive data

## Analytics (CRITICAL)

**MUST include in ALL web Root Layouts:**

```tsx
<Script
  src="https://rybbit.girok.dev/api/script.js"
  data-site-id="7a5f53c5f793"
  strategy="afterInteractive"
/>
```

Never remove, applies to all environments.

## Performance

**Response Time Targets (p95):**

- Simple queries: < 50ms
- List endpoints: < 200ms
- Complex queries: < 500ms
- Mutations: < 300ms

**Backend:**

- Index foreign keys
- Use cursor pagination for large datasets
- Cache frequently accessed data (Redis)
- Use SELECT only needed fields

**Frontend (React):**

```typescript
// ❌ DON'T: Inline in map
{items.map(item => <button onClick={() => handle(item.id)}>X</button>)}

// ✅ DO: Memoize
const handleClick = useCallback((id) => handle(id), []);
{items.map(item => <button onClick={() => handleClick(item.id)}>X</button>)}

// ❌ DON'T: State for nav
const [nav, setNav] = useState(null);
useEffect(() => { if(nav) navigate(nav) }, [nav]);

// ✅ DO: Direct call
navigate('/path'); // Works in React Router v7
```

## Over-Engineering Policy (2025)

**Project prefers over-engineering for production quality code.**

### ALWAYS Apply (Mandatory):

- ✅ `React.memo()` for ALL list item components (MenuCard, MenuRow, etc.)
- ✅ `useCallback()` for ALL event handlers
- ✅ `useMemo()` for ALL derived arrays/objects
- ✅ Static class definitions OUTSIDE component functions
- ✅ Extract constants to module scope
- ✅ Comprehensive JSDoc comments with @example

### Performance Patterns:

```typescript
// ✅ ALWAYS: Memoize list components
export const ListItem = memo(function ListItem(props) { ... });

// ✅ ALWAYS: Memoize handlers
const handleClick = useCallback((id) => doSomething(id), []);

// ✅ ALWAYS: Memoize derived data
const filteredItems = useMemo(() => items.filter(...), [items]);

// ✅ ALWAYS: Static classes outside component
const baseClasses = 'px-4 py-2 rounded-lg';
export function Button() { ... }
```

### Rationale:

- Prevents subtle re-render bugs in complex UIs
- Enables future scalability without refactoring
- Maintains consistent code patterns across codebase
- Target: <16ms render time for all components

## Common Packages

### Backend: @my-girok/nest-common

**Use for all NestJS services:**

```typescript
// Bootstrap with standard configuration
import { configureApp } from '@my-girok/nest-common';

const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'My Service',
  description: 'Service description',
  defaultPort: 4000,
});
```

**Available utilities:**

- `@Public()` - Mark endpoints as public (skip JWT auth)
- `@CurrentUser()` - Extract user from request
- `JwtAuthGuard` - JWT authentication with @Public() support
- `JwtStrategy` - Passport JWT strategy (use for non-auth services)
- `HttpExceptionFilter` - Standard error format
- `configureApp()` - Bootstrap factory (reduces main.ts from ~100 to ~20 lines)
- `HealthModule` - Health check with K8s graceful shutdown support
- `GracefulShutdownService` - Manual shutdown control
- `BasePrismaService` - Prisma service with lifecycle hooks
- `ApiErrorResponse` / `ApiSuccessResponse` - Standard response types

**Health Endpoints (HealthModule):**

- `GET /health` - General health check
- `GET /health/live` - K8s liveness probe
- `GET /health/ready` - K8s readiness probe (503 during shutdown)

### Frontend: @my-girok/ui-components

**Use for all React applications:**

```typescript
import {
  TextInput,
  SelectInput,
  Button,
  Alert,
  SortableList,
  SortableItem,
  useAsyncOperation,
} from '@my-girok/ui-components';
```

**Form components:**

- `TextInput` - Text/email/password with validation
- `SelectInput` - Dropdown with options
- `Button` - Multi-variant (primary/secondary/danger/ghost) with loading
- `Alert` - Notifications (success/error/warning/info)

**Drag & Drop:**

- `SortableList` - Sortable container (@dnd-kit wrapper)
- `SortableItem` - Sortable item with drag handle support

**Hooks:**

- `useAsyncOperation` - Async operations with loading/error states

## Common Patterns

**New Backend Service:**

1. Add `@my-girok/nest-common` to package.json dependencies
2. Use `configureApp()` in main.ts for bootstrap
3. Import `HealthModule` in AppModule for K8s health checks
4. Use `JwtAuthGuard` as global APP_GUARD
5. Use `HttpExceptionFilter` as global APP_FILTER
6. Define types in `packages/types`
7. Update Prisma schema → migrate
8. Create Service (use `@Transactional()`)
9. Create Controller (use `@Public()`, `@CurrentUser()`)
10. Write tests (80% coverage)
11. Update Dockerfile to include nest-common package
12. Create PR

**New Frontend Feature:**

1. Use `@my-girok/ui-components` for UI
2. Use shared types from `packages/types`
3. Use `useAsyncOperation` for API calls
4. Use `SortableList` for drag-and-drop
5. Write tests (80% coverage)
6. Create PR

## Stack Reference

- **Web**: React 19.2 + Vite 7.2, Next.js 15, TypeScript 5.9, Tailwind 4.1
- **Mobile**: Flutter 3.24+ (Dart 3.5+) - iOS & Android
- **Backend**: Node.js 24, NestJS 11
- **Database**: PostgreSQL 16 + Prisma 6 + Redis
- **AI**: Python 3.13, FastAPI
- **Tools**: pnpm, Turborepo
- **Deploy**: Kubernetes, Kustomize, Sealed Secrets

## Documentation Links

**Detailed policies:** See `docs/policies/`

- SECURITY.md - Security policies
- TESTING.md - Testing standards
- PERFORMANCE.md - Performance optimization
- DEPLOYMENT.md - Kubernetes deployment

**Read this file first, then refer to specific service/app documentation in `.ai/services/` or `.ai/apps/`**
