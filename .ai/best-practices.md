# 2026 Best Practices

> Monthly review checklist | **Last Updated**: 2026-01-18

| Category       | Do                                          | Don't                                       |
| -------------- | ------------------------------------------- | ------------------------------------------- |
| **Database**   | goose, UUIDv7, TIMESTAMPTZ(6)               | prisma migrate, TEXT IDs                    |
| **React 19+**  | React Compiler, `use()`, RSC, Design tokens | Manual memo, useEffect fetch, inline styles |
| **State**      | Zustand/Context/Jotai                       | Redux everywhere, prop drilling             |
| **TypeScript** | Zod validation, `unknown`, strict mode      | `any` abuse, trust external data            |
| **Backend**    | `@Transactional()`, gRPC, class-validator   | Manual transactions, REST everywhere        |
| **Testing**    | 80% coverage, test fixtures                 | Skip tests, hardcoded data                  |
| **Git**        | Squash feat→develop, Merge develop→main     | Merge on features, squash on release        |

## Anti-Patterns

```
❌ Over-engineering
❌ Abstractions for one-time ops
❌ Features beyond requirements
```

**SSOT**: `docs/llm/best-practices.md`
