# Core Development Rules

> Essential rules for AI assistants | **Last Updated**: 2026-01-06

## Language Policy

**ALL code, documentation, and commits MUST be in English.**

## Documentation Policy

**Code changes MUST include documentation updates.** No confirmation needed.

### Documentation Structure

| Directory | Purpose                      | Audience      | Content                     |
| --------- | ---------------------------- | ------------- | --------------------------- |
| `.ai/`    | Token-optimized LLM docs     | AI assistants | Patterns, APIs, examples    |
| `docs/`   | Detailed human-readable docs | Human + LLM   | Policies, guides, tutorials |

### Update Requirements

| Change Type            | `.ai/` Update                 | `docs/` Update          |
| ---------------------- | ----------------------------- | ----------------------- |
| New component/hook     | Add to `apps/` or `packages/` | -                       |
| New API endpoint       | Add to `services/`            | -                       |
| New pattern/convention | Add to `rules.md`             | -                       |
| New feature (major)    | Add section to relevant file  | Add to `guides/`        |
| New policy             | Summary in `rules.md`         | Full doc in `policies/` |
| Breaking change        | Update affected files         | Update affected files   |

**Principle**: `.ai/` = concise (what, how), `docs/` = detailed (why, deep dive).

## Architecture Rules

### NEVER

| Category  | Rule                                            |
| --------- | ----------------------------------------------- |
| Types     | Duplicate types → Use `packages/types`          |
| Utils     | Duplicate NestJS/UI utils → Use shared packages |
| DB        | Use `prisma migrate` → Use goose (SSOT)         |
| DB        | Use TEXT for IDs → Use native UUID with UUIDv7  |
| DB        | Auto-sync ArgoCD for DB → Manual Sync only      |
| Code      | Prisma in Controllers → Use Services            |
| Code      | Hardcode secrets → Use ConfigService            |
| Code      | Skip error handling                             |
| React     | Recreate expensive objects every render         |
| React     | State for navigation → Call navigate() directly |
| HTML      | Nested `<main>` tags → One per page             |
| HTML      | Footer inside `<main>` → Footer sibling of main |
| Resources | External CDN links → Self-host locally          |
| Fonts     | Google Fonts CDN → Use design-tokens package    |

### ALWAYS

| Category  | Rule                                      |
| --------- | ----------------------------------------- |
| Types     | Define first in `packages/types`          |
| Backend   | Use `@my-girok/nest-common`               |
| Frontend  | Use `@my-girok/ui-components`             |
| DB        | Use goose for migrations                  |
| DB        | Use `TIMESTAMPTZ(6)` for timestamps       |
| DB        | Include `-- +goose Down`                  |
| Code      | Use `@Transactional()` for multi-step DB  |
| Code      | Use Guards for protected endpoints        |
| Code      | Prevent N+1 queries                       |
| React     | Use React.memo for list item components   |
| React     | Use useMemo for expensive calculations    |
| Testing   | **80% coverage minimum (CI blocks)**      |
| Testing   | Check `docs/TEST_COVERAGE.md` before work |
| Testing   | Include tests with code changes           |
| Testing   | Mock gRPC clients in consumer services    |
| Resources | Self-host fonts/scripts in design-tokens  |
| Resources | Include LICENSE for external resources    |

## Key Patterns

### Transaction

```typescript
@Transactional()
async create(dto: CreatePostDto) {
  await this.postsRepo.create(dto);
  await this.tagsRepo.connect(post.id, dto.tags);
}
```

### Query Optimization

```typescript
// ❌ N+1
for (const post of posts) {
  post.author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ Include
const posts = await prisma.post.findMany({ include: { author: true } });
```

### React 19 Optimization

```typescript
// ✅ React.memo for list item components (prevents parent re-render cascade)
export const ListItem = memo(function ListItem({ item, onUpdate }) {
  return <div onClick={() => onUpdate(item.id)}>{item.name}</div>;
});

// ✅ useMemo for expensive calculations only
const sortedItems = useMemo(
  () => items.toSorted((a, b) => complexSort(a, b)),
  [items]
);

// ✅ Direct handlers (React 19 Compiler auto-optimizes)
const handleClick = (id: string) => updateItem(id);

// ✅ Direct navigation
navigate('/path');  // Not useState + useEffect
```

> **Note**: React 19 Compiler automatically memoizes most cases.
> Manual useCallback/useMemo only needed for expensive operations.

### gRPC Client Mocking

```typescript
// Consumer service test setup
let mockIdentityClient: { getAccount: jest.Mock; getProfile: jest.Mock };

beforeEach(async () => {
  mockIdentityClient = { getAccount: jest.fn(), getProfile: jest.fn() };

  const module = await Test.createTestingModule({
    providers: [MyService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
  }).compile();
});

// Mock gRPC response
mockIdentityClient.getAccount.mockResolvedValue({
  account: { id: 'user-123', email: 'test@example.com' },
});
```

## Database Migrations

```bash
# Create
goose -dir migrations create add_feature sql

# Apply
goose -dir migrations postgres "$DATABASE_URL" up

# Sync Prisma
pnpm prisma db pull && pnpm prisma generate
```

```sql
-- +goose Up
CREATE TABLE features (
    id UUID PRIMARY KEY,  -- UUIDv7 from application (not gen_random_uuid)
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS features;
```

## Security

| Rule    | Details                                     |
| ------- | ------------------------------------------- |
| Secrets | Sealed Secrets or ESO, never commit         |
| Input   | class-validator DTOs, sanitize HTML         |
| Auth    | JWT: Access (15min) + Refresh (14days)      |
| CORS    | iOS Safari: explicit headers + maxAge: 3600 |

## Identity Platform

> Policy: `docs/policies/IDENTITY_PLATFORM.md`

### Triple-Layer Access Control

| Layer  | Can Disable? | Notes                      |
| ------ | ------------ | -------------------------- |
| Domain | Yes          | Dev/staging environments   |
| JWT    | **NO**       | Always required (RFC 9068) |
| Header | Yes          | Internal tools, testing    |

### Security Levels

| Level    | Domain | JWT | Header | Use Case             |
| -------- | ------ | --- | ------ | -------------------- |
| STRICT   | ✅     | ✅  | ✅     | Production (default) |
| STANDARD | ❌     | ✅  | ✅     | Staging, internal    |
| RELAXED  | ❌     | ✅  | ❌     | Development          |

### Test Mode Constraints

| Constraint   | Value    | Reason                  |
| ------------ | -------- | ----------------------- |
| Max Duration | 7 days   | Prevent forgotten tests |
| IP Whitelist | Required | No public test access   |
| JWT          | Always   | Security baseline       |

### App Version Policy

| Version           | Action       | HTTP Status |
| ----------------- | ------------ | ----------- |
| < minVersion      | Force update | 426         |
| < recommendedVer  | Soft update  | 200         |
| in deprecatedList | Block        | 426         |

## Performance Targets (p95)

| Type            | Target  |
| --------------- | ------- |
| Simple queries  | < 50ms  |
| List endpoints  | < 200ms |
| Complex queries | < 500ms |
| Mutations       | < 300ms |

## Commit Format

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, docs, test, chore, perf
```

## Stack

| Category | Technology                                         |
| -------- | -------------------------------------------------- |
| Web      | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind 4.1 |
| Mobile   | iOS (Swift), Android (Kotlin), Flutter             |
| Backend  | Node.js 24, NestJS 11                              |
| Database | PostgreSQL 16, Prisma 6, Valkey                    |
| Deploy   | Kubernetes, Kustomize, Sealed Secrets              |

## Common Packages

### @my-girok/nest-common

```typescript
import { configureApp, JwtAuthGuard, Public, CurrentUser } from '@my-girok/nest-common';
```

### @my-girok/ui-components

```typescript
import { TextInput, Button, Alert, SortableList } from '@my-girok/ui-components';
```

---

**Detailed policies**: `docs/policies/`
