# Best Practices 2026

**Review**: Monthly | **Updated**: 2026-01-02

## Stack

| Category  | Tech                              | Version             |
| --------- | --------------------------------- | ------------------- |
| Frontend  | React, TypeScript, Tailwind, Vite | 19.2, 5.9, 4.1, 7.2 |
| Backend   | Node.js, NestJS, Prisma           | 24, 11, 6           |
| Database  | PostgreSQL, ClickHouse, Valkey    | 16, Latest, Latest  |
| Migration | goose                             | Latest              |
| DevOps    | K8s, ArgoCD, Helm                 | 1.30, 2.13, 3.16    |

## Checklist

### Database

- [ ] goose for all migrations (SSOT)
- [ ] No Prisma migrations (only db pull)
- [ ] ClickHouse: StatementBegin/End
- [ ] Naming: YYYYMMDDHHMMSS_desc.sql
- [ ] Always include -- +goose Down
- [ ] PostgreSQL: TEXT for IDs, TIMESTAMPTZ(6)
- [ ] ClickHouse: UUIDv7

### Frontend (React 19+)

- [ ] React Compiler (no manual memo)
- [ ] use() hook for async
- [ ] useOptimistic, useActionState
- [ ] Tailwind CSS 4 with @theme
- [ ] design-tokens package
- [ ] WCAG 2.1 AAA (4.5:1, 44px)
- [ ] No inline styles

### Backend (NestJS 11+)

- [ ] @Transactional() for multi-step DB
- [ ] gRPC internal, REST external
- [ ] @my-girok/nest-common utilities
- [ ] class-validator
- [ ] Rate limiting on public

### TypeScript 5.9+

- [ ] Strict mode
- [ ] No any (use unknown)
- [ ] satisfies, const params
- [ ] @my-girok/types
- [ ] Prisma-generated types

### Testing

- [ ] 80% coverage
- [ ] Unit, Integration, E2E
- [ ] No time-dependent tests
- [ ] Test fixtures

### Security

- [ ] Sealed Secrets / Vault
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting auth
- [ ] Audit logging

### DevOps

- [ ] GitHub Actions CI
- [ ] ArgoCD GitOps
- [ ] Manual sync for DB
- [ ] Helm charts
- [ ] Health checks
- [ ] Resource limits
- [ ] HPA

### Git

- [ ] GitFlow
- [ ] Squash: feat -> develop
- [ ] Merge: develop -> release -> main
- [ ] Conventional commits
- [ ] PR reviews
- [ ] Branch protection

## Anti-Patterns

### Database

| DO NOT                     | USE           |
| -------------------------- | ------------- |
| prisma migrate             | goose         |
| UUID type (PostgreSQL)     | TEXT          |
| Modify existing migrations | New migration |
| Auto-sync ArgoCD for DB    | Manual sync   |

### Frontend

| DO NOT                          | USE            |
| ------------------------------- | -------------- |
| Manual memo/useMemo/useCallback | React Compiler |
| Inline styles                   | SSOT tokens    |
| Direct DOM manipulation         | React          |
| Prop drilling                   | Context/state  |

### Backend

| DO NOT               | USE           |
| -------------------- | ------------- |
| Logic in controllers | Services      |
| Direct DB access     | Repository    |
| Sync I/O             | Async         |
| Hardcoded config     | ConfigService |

### General

| DO NOT                          |
| ------------------------------- |
| Over-engineer for hypotheticals |
| Abstractions for one-time ops   |
| Features beyond requested       |
| Backward-compat for unused code |
