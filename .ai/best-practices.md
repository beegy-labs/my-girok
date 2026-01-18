# 2026 Best Practices

> Monthly review checklist | **Last Updated**: 2026-01-18

## Database

| Do                   | Don't            |
| -------------------- | ---------------- |
| goose for migrations | `prisma migrate` |
| UUIDv7 for IDs       | TEXT/varchar IDs |
| TIMESTAMPTZ(6)       | TIMESTAMP        |

## React 19+

| Do                      | Don't                 |
| ----------------------- | --------------------- |
| React Compiler          | Manual memo/useMemo   |
| `use()` for async       | useEffect fetch       |
| Server Components (RSC) | Client-only rendering |
| Design tokens (SSOT)    | Inline styles         |

## State Management

| Do                       | Don't                          |
| ------------------------ | ------------------------------ |
| Zustand (small/mid apps) | Redux everywhere               |
| Context API (simple)     | Prop drilling                  |
| Jotai (atomic state)     | Complex state for simple cases |

## TypeScript

| Do                     | Don't               |
| ---------------------- | ------------------- |
| Zod for API validation | Trust external data |
| `unknown` over `any`   | `any` type abuse    |
| Strict mode enabled    | Loose type checking |

## Backend

| Do                 | Don't               |
| ------------------ | ------------------- |
| `@Transactional()` | Manual transactions |
| gRPC internal      | REST everywhere     |
| class-validator    | Manual validation   |

## Testing

| Do            | Don't          |
| ------------- | -------------- |
| 80% coverage  | Skip tests     |
| Test fixtures | Hardcoded data |

## Git

| Do                     | Don't             |
| ---------------------- | ----------------- |
| Squash: feat → develop | Merge on features |
| Merge: develop → main  | Squash on release |

## Anti-Patterns

```
❌ Over-engineering
❌ Abstractions for one-time ops
❌ Features beyond requirements
```

**SSOT**: `docs/llm/best-practices.md`
