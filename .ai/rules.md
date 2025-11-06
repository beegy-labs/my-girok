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

## Common Patterns

**New Feature Workflow:**
1. Define types in `packages/types`
2. Update Prisma schema → migrate
3. Create Repository (extends BaseRepository)
4. Create Service (use `@Transactional()`)
5. Create Controller (add validation)
6. Frontend API call with shared types
7. Write tests (80% coverage)
8. Create PR

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
