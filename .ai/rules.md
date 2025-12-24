# Core Development Rules

> Essential rules for AI assistants

## Language Policy

**ALL code, documentation, and commits MUST be in English.**

## Architecture Rules

### NEVER

| Category | Rule                                            |
| -------- | ----------------------------------------------- |
| Types    | Duplicate types → Use `packages/types`          |
| Utils    | Duplicate NestJS/UI utils → Use shared packages |
| DB       | Use `prisma migrate` → Use goose (SSOT)         |
| DB       | Use UUID type → Use TEXT with gen_random_uuid() |
| DB       | Auto-sync ArgoCD for DB → Manual Sync only      |
| Code     | Prisma in Controllers → Use Services            |
| Code     | Hardcode secrets → Use ConfigService            |
| Code     | Skip error handling                             |
| React    | Recreate expensive objects every render         |
| React    | State for navigation → Call navigate() directly |
| HTML     | Nested `<main>` tags → One per page             |
| HTML     | Footer inside `<main>` → Footer sibling of main |

### ALWAYS

| Category | Rule                                     |
| -------- | ---------------------------------------- |
| Types    | Define first in `packages/types`         |
| Backend  | Use `@my-girok/nest-common`              |
| Frontend | Use `@my-girok/ui-components`            |
| DB       | Use goose for migrations                 |
| DB       | Use `TIMESTAMPTZ(6)` for timestamps      |
| DB       | Include `-- +goose Down`                 |
| Code     | Use `@Transactional()` for multi-step DB |
| Code     | Use Guards for protected endpoints       |
| Code     | Prevent N+1 queries                      |
| React    | Use React.memo for list item components  |
| React    | Use useMemo for expensive calculations   |
| Testing  | 80% coverage minimum                     |

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
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
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
| Auth    | JWT: Access (15min) + Refresh (7days)       |
| CORS    | iOS Safari: explicit headers + maxAge: 3600 |

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
