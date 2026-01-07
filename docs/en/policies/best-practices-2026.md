# Best Practices 2026

> Monthly review checklist for development standards

**Review Cycle**: Monthly
**Last Updated**: 2026-01-02

## Technology Stack

| Category  | Technology                            | Version             |
| --------- | ------------------------------------- | ------------------- |
| Frontend  | React, TypeScript, Tailwind CSS, Vite | 19.2, 5.9, 4.1, 7.2 |
| Backend   | Node.js, NestJS, Prisma               | 24, 11, 6           |
| Database  | PostgreSQL, ClickHouse, Valkey        | 16, Latest, Latest  |
| Migration | goose                                 | Latest              |
| DevOps    | Kubernetes, ArgoCD, Helm              | 1.30, 2.13, 3.16    |

## Development Checklists

### Database

- [ ] Use goose for all migrations (SSOT)
- [ ] No Prisma migrations (only `prisma db pull`)
- [ ] ClickHouse: Use StatementBegin/End
- [ ] Naming: YYYYMMDDHHMMSS_description.sql
- [ ] Always include `-- +goose Down`
- [ ] PostgreSQL: TEXT for IDs, TIMESTAMPTZ(6)
- [ ] ClickHouse: UUIDv7 for time-sortable IDs

### Frontend (React 19+)

- [ ] Use React Compiler (no manual memo)
- [ ] Use `use()` hook for async data
- [ ] Use `useOptimistic`, `useActionState`
- [ ] Tailwind CSS 4 with @theme directive
- [ ] Import from design-tokens package
- [ ] WCAG 2.1 AAA (4.5:1 contrast, 44px touch targets)
- [ ] No inline styles

### Backend (NestJS 11+)

- [ ] `@Transactional()` for multi-step DB operations
- [ ] gRPC for internal, REST for external
- [ ] Use @my-girok/nest-common utilities
- [ ] Validate with class-validator
- [ ] Rate limiting on public endpoints

### TypeScript 5.9+

- [ ] Strict mode enabled
- [ ] No `any` (use `unknown`)
- [ ] Use `satisfies`, const type parameters
- [ ] Import from @my-girok/types
- [ ] Use Prisma-generated types

### Testing

- [ ] 80% minimum coverage
- [ ] Unit, Integration, and E2E tests
- [ ] No time-dependent tests
- [ ] Use test fixtures

### Security

- [ ] Sealed Secrets / HashiCorp Vault
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting on auth endpoints
- [ ] Comprehensive audit logging

### DevOps

- [ ] GitHub Actions CI/CD
- [ ] ArgoCD GitOps deployment
- [ ] Manual sync for DB changes
- [ ] Helm charts for all services
- [ ] Health check endpoints
- [ ] Resource limits configured
- [ ] HPA (Horizontal Pod Autoscaler)

### Git Workflow

- [ ] Follow GitFlow branching
- [ ] Squash merge: feature → develop
- [ ] Regular merge: develop → release → main
- [ ] Conventional commit messages
- [ ] Mandatory PR reviews
- [ ] Branch protection rules

## Anti-Patterns to Avoid

### Database

| DO NOT                     | USE INSTEAD   |
| -------------------------- | ------------- |
| prisma migrate             | goose         |
| UUID type (PostgreSQL)     | TEXT          |
| Modify existing migrations | New migration |
| Auto-sync ArgoCD for DB    | Manual sync   |

### Frontend

| DO NOT                          | USE INSTEAD                 |
| ------------------------------- | --------------------------- |
| Manual memo/useMemo/useCallback | React Compiler              |
| Inline styles                   | SSOT design tokens          |
| Direct DOM manipulation         | React state                 |
| Prop drilling                   | Context or state management |

### Backend

| DO NOT                  | USE INSTEAD        |
| ----------------------- | ------------------ |
| Logic in controllers    | Services layer     |
| Direct DB access        | Repository pattern |
| Synchronous I/O         | Async/await        |
| Hardcoded configuration | ConfigService      |

### General Principles

| AVOID                                          |
| ---------------------------------------------- |
| Over-engineering for hypothetical requirements |
| Abstractions for one-time operations           |
| Features beyond what was requested             |
| Backward-compatibility for unused code         |

---

**LLM Reference**: `docs/llm/policies/BEST_PRACTICES_2026.md`
