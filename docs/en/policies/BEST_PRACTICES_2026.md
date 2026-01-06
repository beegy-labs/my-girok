# 2026 Best Practices

> Monthly review checklist for codebase maintenance

**Last Updated**: 2026-01-02
**Next Review**: 2026-02-01

---

## Monthly Review Checklist

Use this checklist during monthly code reviews to ensure the codebase follows current best practices.

### Database & Migrations

- [ ] All migrations use goose (SSOT)
- [ ] No Prisma migrations exist (only `prisma db pull`)
- [ ] ClickHouse migrations use `-- +goose StatementBegin/End`
- [ ] Migration naming: `YYYYMMDDHHMMSS_description.sql`
- [ ] All migrations have `-- +goose Down` section
- [ ] PostgreSQL uses TEXT for IDs (not UUID type)
- [ ] PostgreSQL uses TIMESTAMPTZ(6) (not TIMESTAMP)
- [ ] ClickHouse uses UUIDv7 (not UUIDv4)

### Frontend (React 19+)

- [ ] Use React Compiler (no manual memo/useMemo/useCallback)
- [ ] Use `use()` hook for async data fetching
- [ ] Use Server Components where applicable
- [ ] Use `useOptimistic` for optimistic updates
- [ ] Use `useActionState` for form handling
- [ ] Tailwind CSS 4 with CSS variables (@theme)
- [ ] Design tokens from `packages/design-tokens`
- [ ] WCAG 2.1 AAA compliance (4.5:1 contrast, 44px touch targets)
- [ ] No inline styles (use SSOT tokens)

### Backend (NestJS 11+)

- [ ] Use `@Transactional()` for multi-step DB operations
- [ ] Use dependency injection consistently
- [ ] gRPC for internal service communication
- [ ] REST for external APIs
- [ ] Use `@my-girok/nest-common` utilities
- [ ] Error handling with proper HTTP status codes
- [ ] Input validation with class-validator
- [ ] Rate limiting on public endpoints

### TypeScript (5.9+)

- [ ] Strict mode enabled
- [ ] No `any` types (use `unknown` if needed)
- [ ] Use `satisfies` operator for type narrowing
- [ ] Use `const` type parameters
- [ ] Shared types in `@my-girok/types`
- [ ] Prisma-generated types for DB models

### Testing

- [ ] 80% minimum coverage
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows
- [ ] No time-dependent test assertions
- [ ] Use test fixtures, not hardcoded data

### Security

- [ ] No secrets in code (use Sealed Secrets / Vault)
- [ ] Input sanitization at boundaries
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for sensitive operations

### DevOps & CI/CD

- [ ] GitHub Actions for CI
- [ ] ArgoCD for GitOps deployment
- [ ] Manual sync for database migrations
- [ ] Helm charts for Kubernetes
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] HPA configured for scalable services

### Documentation

- [ ] `.ai/` folder for LLM-optimized docs
- [ ] `docs/policies/` for detailed policies
- [ ] All code in English
- [ ] No AI attribution in commits
- [ ] README updated for new features
- [ ] API documentation current

### Git & Version Control

- [ ] GitFlow branching strategy
- [ ] Squash merge for feature → develop
- [ ] Merge commit for develop → release → main
- [ ] Conventional commits (feat, fix, refactor, etc.)
- [ ] PR reviews required
- [ ] Branch protection enabled

---

## Technology Stack (2026)

| Category      | Technology     | Version |
| ------------- | -------------- | ------- |
| **Frontend**  | React          | 19.2+   |
|               | TypeScript     | 5.9+    |
|               | Tailwind CSS   | 4.1+    |
|               | Vite           | 7.2+    |
| **Backend**   | Node.js        | 24+     |
|               | NestJS         | 11+     |
|               | Prisma         | 6+      |
| **Database**  | PostgreSQL     | 16+     |
|               | ClickHouse     | Latest  |
|               | Valkey (Redis) | Latest  |
| **Migration** | goose          | Latest  |
| **DevOps**    | Kubernetes     | 1.30+   |
|               | ArgoCD         | 2.13+   |
|               | Helm           | 3.16+   |

---

## Anti-Patterns to Avoid

### Database

- ❌ Using `prisma migrate` (use goose)
- ❌ UUID type in PostgreSQL (use TEXT)
- ❌ Modifying existing migrations
- ❌ Auto-sync ArgoCD for DB changes

### Frontend

- ❌ Manual `memo()`, `useMemo()`, `useCallback()` (React Compiler handles this)
- ❌ Inline styles or arbitrary Tailwind values
- ❌ Direct DOM manipulation
- ❌ Prop drilling (use Context or state management)

### Backend

- ❌ Business logic in controllers
- ❌ Direct database access without repository pattern
- ❌ Synchronous operations for I/O
- ❌ Hardcoded configuration values

### General

- ❌ Over-engineering for hypothetical future needs
- ❌ Creating abstractions for one-time operations
- ❌ Adding features beyond what was requested
- ❌ Backwards-compatibility hacks for unused code

---

## Review History

| Date       | Reviewer | Changes                  |
| ---------- | -------- | ------------------------ |
| 2026-01-02 | -        | Initial document created |

---

## Related Documents

- [Database Policy](./DATABASE.md)
- [Security Policy](./SECURITY.md)
- [Testing Policy](./TESTING.md)
- [Performance Policy](./PERFORMANCE.md)
- [Deployment Policy](./DEPLOYMENT.md)

---

**Quick Reference**: `.ai/best-practices.md`
