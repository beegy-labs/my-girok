# Rules

## Lang

```yaml
code: en
docs: en
commits: en
```

## Doc Structure

| Path      | Type       | Edit |
| --------- | ---------- | ---- |
| .ai/      | Indicate   | Yes  |
| docs/llm/ | SSOT       | Yes  |
| docs/en/  | Generated  | No   |
| docs/kr/  | Translated | No   |

## NEVER

| Cat   | Rule                             |
| ----- | -------------------------------- |
| Types | Duplicate → packages/types       |
| Utils | Duplicate → shared packages      |
| DB    | prisma migrate → goose           |
| DB    | TEXT IDs → UUID (UUIDv7)         |
| DB    | ArgoCD auto-sync → Manual        |
| Code  | Prisma in Controller → Service   |
| Code  | Hardcode secrets → ConfigService |
| React | Recreate objects → memo/useMemo  |
| React | State navigate → navigate()      |
| HTML  | Nested main → One main           |
| HTML  | Footer in main → Sibling         |
| Fonts | CDN → design-tokens              |

## ALWAYS

| Cat      | Rule                               |
| -------- | ---------------------------------- |
| Types    | packages/types first               |
| Backend  | @my-girok/nest-common              |
| Frontend | @my-girok/ui-components            |
| DB       | goose migrations                   |
| DB       | TIMESTAMPTZ(6)                     |
| DB       | -- +goose Down                     |
| Code     | @Transactional() multi-step        |
| Code     | Guards for auth                    |
| Code     | Prevent N+1                        |
| React    | memo for list items                |
| Test     | 80% coverage                       |
| Test     | Mock gRPC clients                  |
| Test     | Check TEST_COVERAGE.md before work |
| Test     | Include tests with code changes    |

## Patterns

### Transaction

```typescript
@Transactional()
async create(dto) {
  await this.repo.create(dto);
  await this.tags.connect(id, dto.tags);
}
```

### N+1 Fix

```typescript
// Bad
for (const p of posts) p.author = await prisma.user.findUnique({ where: { id: p.authorId } });
// Good
const posts = await prisma.post.findMany({ include: { author: true } });
```

### React memo

```typescript
export const Item = memo(({item}) => <div>{item.name}</div>);
const sorted = useMemo(() => items.toSorted(cmp), [items]);
```

## DB Migration

```bash
goose -dir migrations create add_feature sql
goose -dir migrations postgres "$DATABASE_URL" up
pnpm prisma db pull && pnpm prisma generate
```

```sql
-- +goose Up
CREATE TABLE t (id UUID PRIMARY KEY, created_at TIMESTAMPTZ(6) DEFAULT NOW());
-- +goose Down
DROP TABLE IF EXISTS t;
```

## Security

| Rule        | Value                |
| ----------- | -------------------- |
| Secrets     | Sealed Secrets / ESO |
| Input       | class-validator DTOs |
| JWT Access  | 15min                |
| JWT Refresh | 14days               |
| CORS maxAge | 3600                 |

## Perf Targets (p95)

| Type     | Target |
| -------- | ------ |
| Simple   | <50ms  |
| List     | <200ms |
| Complex  | <500ms |
| Mutation | <300ms |

## Commit

```
<type>(<scope>): <subject>
# feat|fix|refactor|docs|test|chore|perf
```

## Stack

| Cat     | Tech                                 |
| ------- | ------------------------------------ |
| Web     | React 19.2, Vite 7.2, TS 5.9, TW 4.1 |
| Mobile  | Swift, Kotlin, Flutter               |
| Backend | Node 24, NestJS 11                   |
| DB      | PG 16, Prisma 6, Valkey              |
| Deploy  | K8s, Kustomize                       |

## Imports

```typescript
// nest-common
import { configureApp, JwtAuthGuard, Public, CurrentUser } from '@my-girok/nest-common';
// ui-components
import { TextInput, Button, Alert, SortableList } from '@my-girok/ui-components';
```
