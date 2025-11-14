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

## Testing

**Coverage Requirements:**
- Unit tests: 80% minimum
- Integration tests: All critical flows
- E2E tests: Main user journeys

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

**Always:**
- Index foreign keys
- Use cursor pagination for large datasets
- Cache frequently accessed data (Redis)
- Use SELECT only needed fields

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
- `HttpExceptionFilter` - Standard error format
- `configureApp()` - Bootstrap factory (reduces main.ts from ~100 to ~20 lines)
- `BasePrismaService` - Prisma service with lifecycle hooks
- `ApiErrorResponse` / `ApiSuccessResponse` - Standard response types

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
1. Use `@my-girok/nest-common` for bootstrap
2. Define types in `packages/types`
3. Update Prisma schema → migrate
4. Create Repository (extends BaseRepository)
5. Create Service (use `@Transactional()`)
6. Create Controller (use `@Public()`, `@CurrentUser()`)
7. Write tests (80% coverage)
8. Create PR

**New Frontend Feature:**
1. Use `@my-girok/ui-components` for UI
2. Use shared types from `packages/types`
3. Use `useAsyncOperation` for API calls
4. Use `SortableList` for drag-and-drop
5. Write tests (80% coverage)
6. Create PR

## Stack Reference

- **Web**: Next.js 15, React 19, TypeScript, Tailwind
- **Mobile**: iOS (Swift), Android (Kotlin)
- **Backend**: Node.js 20, NestJS 10
- **Database**: PostgreSQL 16 + Prisma 5 + Redis
- **AI**: Python 3.11, FastAPI
- **Tools**: pnpm, Turborepo
- **Deploy**: Kubernetes, Kustomize, Sealed Secrets

## Documentation Links

**Detailed policies:** See `docs/policies/`
- SECURITY.md - Security policies
- TESTING.md - Testing standards
- PERFORMANCE.md - Performance optimization
- DEPLOYMENT.md - Kubernetes deployment

**Read this file first, then refer to specific service/app documentation in `.ai/services/` or `.ai/apps/`**
