# 2026 Best Practices (Quick Reference)

> Monthly review checklist - Last updated: 2026-01-02

## Database

| Do                       | Don't            |
| ------------------------ | ---------------- |
| goose for ALL migrations | `prisma migrate` |
| TEXT for PostgreSQL IDs  | UUID type        |
| UUIDv7 for ClickHouse    | UUIDv4           |
| TIMESTAMPTZ(6)           | TIMESTAMP        |
| `-- +goose Down` section | Skip rollback    |
| Manual ArgoCD sync       | Auto-sync for DB |

## React 19+

| Do                             | Don't                           |
| ------------------------------ | ------------------------------- |
| React Compiler (auto-optimize) | Manual memo/useMemo/useCallback |
| `use()` for async data         | useEffect + useState fetch      |
| `useOptimistic` for UI         | Manual optimistic state         |
| `useActionState` for forms     | Manual form state               |
| Design tokens (SSOT)           | Inline styles                   |

## Backend

| Do                                | Don't                       |
| --------------------------------- | --------------------------- |
| `@Transactional()` for multi-step | Manual transaction handling |
| gRPC internal, REST external      | REST for everything         |
| `@my-girok/nest-common` utils     | Duplicate utilities         |
| class-validator                   | Manual validation           |

## TypeScript 5.9+

| Do                     | Don't                      |
| ---------------------- | -------------------------- |
| Strict mode            | `any` types                |
| `satisfies` operator   | Type assertions            |
| `@my-girok/types`      | Duplicate type definitions |
| Prisma-generated types | Manual DB types            |

## Testing

| Do                          | Don't                 |
| --------------------------- | --------------------- |
| 80% minimum coverage        | Skip tests            |
| Test fixtures               | Hardcoded data        |
| Time-independent assertions | `Date.now()` in tests |

## Security

| Do                     | Don't                    |
| ---------------------- | ------------------------ |
| Sealed Secrets / Vault | Secrets in code          |
| Parameterized queries  | String concatenation SQL |
| Rate limiting on auth  | Unlimited attempts       |
| Audit logging          | Silent operations        |

## DevOps

| Do                 | Don't                 |
| ------------------ | --------------------- |
| ArgoCD GitOps      | Manual kubectl apply  |
| Manual sync for DB | Auto-sync migrations  |
| Helm charts        | Raw YAML              |
| Health checks      | No liveness/readiness |

## Documentation

| Do                            | Don't                   |
| ----------------------------- | ----------------------- |
| `.ai/` for LLM docs           | Single monolithic docs  |
| `docs/policies/` for policies | Scattered policy files  |
| English only                  | Mixed languages         |
| No AI attribution             | "Generated with Claude" |

## Git

| Do                              | Don't                     |
| ------------------------------- | ------------------------- |
| Squash: feat → develop          | Merge commits on features |
| Merge: develop → release → main | Squash on release/main    |
| Conventional commits            | Random commit messages    |

## Anti-Patterns

```
❌ Over-engineering for future needs
❌ Abstractions for one-time operations
❌ Features beyond requirements
❌ Backwards-compatibility hacks
```

---

**Full guide**: `docs/policies/BEST_PRACTICES_2026.md`
