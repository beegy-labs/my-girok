# 2026 Best Practices (SSOT)

> **Last Updated**: 2026-01-22
>
> This is the Single Source of Truth for best practices. The `.ai/best-practices.md` is a condensed version.

## Quick Reference

For detailed 2026 industry research, see `docs/llm/references/`:

| Topic          | File                          | Key Points             |
| -------------- | ----------------------------- | ---------------------- |
| RAG & Chunking | `rag-chunking-2026.md`        | 300-800 tokens optimal |
| Frontend       | `frontend-react-2026.md`      | React Compiler, use()  |
| Backend        | `backend-nestjs-2026.md`      | Module design, gRPC    |
| Database       | `database-postgresql-2026.md` | UUIDv7, pgvector       |
| Testing        | `testing-2026.md`             | Pyramid, 80% coverage  |
| Security       | `security-2026.md`            | OWASP Top 10           |
| CI/CD          | `cicd-devops-2026.md`         | GitHub Actions         |
| API Design     | `api-design-2026.md`          | REST/GraphQL/gRPC      |
| Kubernetes     | `kubernetes-2026.md`          | HPA, Helm              |

**Migration Guide**: `policies/best-practices-migration.md` - 코드 변경 필요 사항 추적

## Database

| Do                   | Don't            | Rationale                                                                              |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| goose for migrations | `prisma migrate` | Better version control, SQL-first migrations                                           |
| UUIDv7 for IDs       | TEXT/varchar IDs | PostgreSQL 18 native support, sortable, B-tree friendly, 60% better insert performance |
| TIMESTAMPTZ(6)       | TIMESTAMP        | Timezone awareness, microsecond precision                                              |

### UUIDv7 Best Practices

- **Internal keys**: Use UUIDv7 for primary keys and foreign keys
- **External IDs**: Expose UUIDv4 for public-facing identifiers (privacy concern - UUIDv7 leaks creation timestamp)
- **Storage**: Always use PostgreSQL's native UUID type, not string/text
- **Performance**: Enables sequential inserts, reduces index fragmentation, improves cache utilization

## React 19+

| Do                      | Don't                 | Rationale                                                                 |
| ----------------------- | --------------------- | ------------------------------------------------------------------------- |
| React Compiler          | Manual memo/useMemo   | Automatic optimization, production-ready since Oct 2025, 12% faster loads |
| `use()` for async       | useEffect fetch       | Render-as-you-fetch pattern, eliminates waterfalls, works with Suspense   |
| Server Components (RSC) | Client-only rendering | 60-80% smaller bundles, zero client JS for server components, better SEO  |
| Design tokens (SSOT)    | Inline styles         | Consistency, themability, maintainability                                 |

### React 19 Data Fetching

**Recommended Pattern:**

```tsx
import { use } from 'react';

// Initialize fetch early (route loader, parent component)
const dataPromise = fetchData();

function MyComponent() {
  // use() hook consumes the promise
  const data = use(dataPromise);
  return <div>{data}</div>;
}
```

**Legacy Pattern (Avoid):**

```tsx
// ❌ Don't do this
useEffect(() => {
  fetchData().then(setData);
}, []);
```

### React Server Components

- **When to use**: Data fetching, initial page load, SEO-critical content
- **Framework support**: Next.js 13+ (production-ready), React Router (upcoming), TanStack Start (upcoming)
- **Performance**: Zero client-side JavaScript for server components
- **Trade-off**: No client-side interactivity in server components

## State Management

| Do                         | Don't                          | Use Case                                           |
| -------------------------- | ------------------------------ | -------------------------------------------------- |
| Zustand (small/mid apps)   | Redux everywhere               | Small to medium apps, want simplicity, 3KB bundle  |
| Context API (simple)       | Prop drilling                  | Simple global state, theme, auth, i18n             |
| Jotai (atomic state)       | Complex state for simple cases | Fine-grained reactivity, complex interdependencies |
| Redux Toolkit (enterprise) | Redux without Toolkit          | Large teams, strict patterns, DevTools required    |

### Zustand vs Jotai vs Redux

**Zustand** (Recommended for most projects):

- Single store, simple API
- Minimal boilerplate (~10 lines setup)
- Great middleware ecosystem
- TypeScript-friendly
- **Best for**: 80% of applications

**Jotai** (Specialized use):

- Atom-based (like Recoil)
- Fine-grained re-renders
- Complex derived state
- **Best for**: Apps with highly interconnected state

**Redux Toolkit** (Enterprise):

- Structured, opinionated
- Excellent DevTools
- Time-travel debugging
- **Best for**: Large teams (10+ developers), strict governance

### Migration Path

```
Simple state → Context API
Need performance → Zustand
Complex atomic state → Jotai
Enterprise requirements → Redux Toolkit
```

## TypeScript

| Do                     | Don't               | Rationale                                                     |
| ---------------------- | ------------------- | ------------------------------------------------------------- |
| Zod for API validation | Trust external data | Runtime safety, type inference, API responses need validation |
| `unknown` over `any`   | `any` type abuse    | Forces type checking, safer defaults                          |
| Strict mode enabled    | Loose type checking | Catches bugs at compile time                                  |

### Zod Runtime Validation

**Why**: TypeScript only validates at compile-time. Runtime data (API responses, user input) needs validation.

**Pattern:**

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
});

// Validate API response
const response = await fetch('/api/user');
const data = await response.json();

// safeParse doesn't throw
const result = UserSchema.safeParse(data);
if (!result.success) {
  console.error(result.error);
  return;
}

// Type-safe data
const user = result.data; // TypeScript knows the shape
```

**Benefits:**

- Runtime type safety
- Automatic TypeScript type inference
- Validation error messages
- Works with TypeScript 5.5+

## Backend

| Do                 | Don't               | Rationale                                   |
| ------------------ | ------------------- | ------------------------------------------- |
| `@Transactional()` | Manual transactions | Automatic rollback, connection management   |
| gRPC internal      | REST everywhere     | Type-safe, faster, better for microservices |
| class-validator    | Manual validation   | Declarative, consistent error messages      |

## Testing

| Do            | Don't          | Rationale                           |
| ------------- | -------------- | ----------------------------------- |
| 80% coverage  | Skip tests     | Quality gate, regression prevention |
| Test fixtures | Hardcoded data | Reusability, maintenance            |

## Git

| Do                     | Don't             | Rationale                |
| ---------------------- | ----------------- | ------------------------ |
| Squash: feat → develop | Merge on features | Clean history on develop |
| Merge: develop → main  | Squash on release | Preserve release history |

## Anti-Patterns

```
❌ Over-engineering
   - Adding abstractions before they're needed
   - Creating generic solutions for specific problems

❌ Abstractions for one-time ops
   - Helper functions used once
   - Premature optimization

❌ Features beyond requirements
   - "Nice to have" features
   - Speculative generality
```

## References

### React 19 & Compiler

- [React Compiler 1.0 Announcement](https://react.dev/blog/2025/10/07/react-compiler-1) (Oct 2025)
- [Meta's React Compiler Production Results](https://www.infoq.com/news/2025/12/react-compiler-meta/) (Dec 2025)

### UUIDv7

- [PostgreSQL 18 UUIDv7 Support](https://www.thenile.dev/blog/uuidv7) (Sep 2025)
- [UUIDv7 Performance Benchmarks](https://dev.to/umangsinha12/postgresql-uuid-performance-benchmarking-random-v4-and-time-based-v7-uuids-n9b)

### State Management

- [State Management in 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [Zustand vs Jotai Comparison](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/)

### Zod

- [Zod TypeScript Runtime Validation](https://zod.dev/)
- [How Zod Changed TypeScript Validation](https://iamshadi.medium.com/how-zod-changed-typescript-validation-forever-the-power-of-runtime-and-compile-time-validation-531cd63799cf)
