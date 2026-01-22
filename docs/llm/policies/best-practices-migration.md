# Best Practices Migration Guide

> 2026 Best Practices 적용을 위한 코드 변경 사항 | **Updated**: 2026-01-22

## Overview

이 문서는 `docs/llm/references/` 2026 Best Practices를 기반으로 코드베이스에 필요한 변경 사항을 추적합니다.

## Migration Status

| Category            | Status     | Priority |
| ------------------- | ---------- | -------- |
| Frontend (React 19) | 🟡 Partial | High     |
| Backend (NestJS)    | 🟢 Aligned | -        |
| Database            | 🟡 Partial | Medium   |
| Testing             | 🟡 Partial | Medium   |
| Security            | 🟢 Aligned | -        |
| CI/CD               | 🟢 Aligned | -        |

---

## Frontend (React 19)

**Reference**: `references/frontend-react-2026.md`

### React Compiler

| Current                         | Target                          | Files                | Impact |
| ------------------------------- | ------------------------------- | -------------------- | ------ |
| Manual memo/useMemo/useCallback | React Compiler auto-memoization | All React components | High   |

**Action Items**:

```
[ ] Enable React Compiler in vite.config.ts
[ ] Remove manual memo() wraps
[ ] Remove useMemo where only for memoization
[ ] Remove useCallback where only for memoization
[ ] Keep useMemo/useCallback for semantic purposes (e.g., dependencies)
```

**Affected Directories**:

- `apps/web-girok/src/`
- `apps/web-admin/src/`
- `apps/storybook/`

### use() Hook for Data Fetching

| Current                    | Target              | Files                    | Impact |
| -------------------------- | ------------------- | ------------------------ | ------ |
| useEffect + useState fetch | use() with Suspense | Data fetching components | Medium |

**Action Items**:

```
[ ] Identify components using useEffect for data fetching
[ ] Refactor to use() hook pattern
[ ] Add Suspense boundaries
[ ] Update error boundaries for async errors
```

**Pattern Change**:

```tsx
// Before
useEffect(() => {
  fetchData().then(setData);
}, []);

// After
const dataPromise = fetchData(); // Lifted to parent/loader
const data = use(dataPromise);
```

### State Management

| Current                | Target  | Status     |
| ---------------------- | ------- | ---------- |
| Zustand                | Zustand | ✅ Aligned |
| Context for theme/auth | Context | ✅ Aligned |

---

## Backend (NestJS)

**Reference**: `references/backend-nestjs-2026.md`

### Current Alignment

| Practice                  | Status | Notes               |
| ------------------------- | ------ | ------------------- |
| Module-based architecture | ✅     | Already implemented |
| @Transactional()          | ✅     | Using nest-common   |
| gRPC internal             | ✅     | Auth-BFF ↔ Services |
| class-validator           | ✅     | All DTOs validated  |
| Repository pattern        | ✅     | Prisma repositories |

### Potential Improvements

```
[ ] Worker Threads for CPU-heavy tasks (PDF generation, image processing)
[ ] Connection pooling audit for high-traffic services
```

---

## Database (PostgreSQL)

**Reference**: `references/database-postgresql-2026.md`

### UUIDv7 Migration

| Current              | Target                   | Impact |
| -------------------- | ------------------------ | ------ |
| UUIDv4 (some tables) | UUIDv7 for internal keys | Medium |
| TEXT IDs (legacy)    | UUID type                | Low    |

**Action Items**:

```
[ ] Audit tables using UUIDv4 for primary keys
[ ] Create migration plan for UUIDv7 adoption
[ ] Keep UUIDv4 for external/public-facing IDs (privacy)
[ ] Update Prisma schema to use gen_random_uuidv7() default
```

**Migration Script Template**:

```sql
-- Example: Migrate to UUIDv7 for new inserts
ALTER TABLE users
ALTER COLUMN id SET DEFAULT gen_random_uuidv7();
-- Note: Existing data remains UUIDv4, new rows get UUIDv7
```

### pgvector for AI Features

| Current         | Target                  | Impact |
| --------------- | ----------------------- | ------ |
| Not implemented | pgvector for embeddings | Future |

**Action Items**:

```
[ ] Evaluate AI/embedding features requiring vector search
[ ] Add pgvector extension when needed
[ ] Design embedding storage schema
```

### Index Optimization

```
[ ] Run EXPLAIN ANALYZE on slow queries
[ ] Review composite index ordering
[ ] Add covering indexes for frequent queries
[ ] Enable pg_stat_statements in production
```

---

## Testing

**Reference**: `references/testing-2026.md`

### Coverage

| Current      | Target      | Gap  |
| ------------ | ----------- | ---- |
| ~70% average | 80% minimum | +10% |

**Action Items**:

```
[ ] Increase unit test coverage to 80%
[ ] Add integration tests for API contracts
[ ] Implement test fixtures for reusable data
[ ] Add Playwright E2E for critical flows
```

### Test Configuration

| Current           | Target              | Files            |
| ----------------- | ------------------- | ---------------- |
| Vitest configured | Coverage thresholds | vitest.config.ts |

**Action Items**:

```
[ ] Add coverage thresholds to vitest.config.ts
[ ] Configure CI to fail on coverage drop
[ ] Add test matrix for Node.js versions
```

---

## Security

**Reference**: `references/security-2026.md`

### Current Alignment

| Practice                           | Status |
| ---------------------------------- | ------ |
| Input validation (class-validator) | ✅     |
| SQL injection prevention (Prisma)  | ✅     |
| XSS prevention (React default)     | ✅     |
| CSRF (SameSite cookies)            | ✅     |
| Rate limiting                      | ✅     |
| Helmet.js                          | ✅     |

### SBOM Implementation

| Current         | Target         | Priority      |
| --------------- | -------------- | ------------- |
| Not implemented | CycloneDX SBOM | Low (2026 Q3) |

**Action Items**:

```
[ ] Add @cyclonedx/cyclonedx-npm to CI
[ ] Generate SBOM on releases
[ ] Integrate with dependency scanning
```

---

## CI/CD

**Reference**: `references/cicd-devops-2026.md`

### Current Alignment

| Practice       | Status |
| -------------- | ------ |
| GitHub Actions | ✅     |
| Matrix builds  | ✅     |
| Caching (pnpm) | ✅     |
| ArgoCD GitOps  | ✅     |
| Sealed Secrets | ✅     |

### Potential Improvements

```
[ ] Add CodeQL SAST to CI
[ ] Add dependency-review-action for PRs
[ ] Implement canary deployments with Argo Rollouts
```

---

## API Design

**Reference**: `references/api-design-2026.md`

### Current Alignment

| Pattern                | Status |
| ---------------------- | ------ |
| REST for external APIs | ✅     |
| GraphQL Federation     | ✅     |
| gRPC for internal      | ✅     |
| OpenAPI documentation  | ✅     |

---

## Kubernetes

**Reference**: `references/kubernetes-2026.md`

### Current Alignment

| Practice                 | Status |
| ------------------------ | ------ |
| Resource requests/limits | ✅     |
| HPA configured           | ✅     |
| Health probes            | ✅     |
| Network policies         | ✅     |
| Helm charts              | ✅     |

### Security Hardening

```
[ ] Audit Pod Security Standards
[ ] Verify runAsNonRoot on all deployments
[ ] Review service account permissions
```

---

## Priority Matrix

| Priority | Category                | Effort | Impact               |
| -------- | ----------------------- | ------ | -------------------- |
| P0       | React Compiler adoption | Medium | High (performance)   |
| P1       | Test coverage to 80%    | High   | Medium (quality)     |
| P2       | UUIDv7 migration        | Medium | Medium (performance) |
| P3       | use() hook refactoring  | Medium | Medium (DX)          |
| P4       | SBOM implementation     | Low    | Low (compliance)     |
| P5       | CodeQL/SAST in CI       | Low    | Medium (security)    |

---

## How to Use This Document

1. **Before starting migration**: Review this document
2. **Request changes**: Reference specific sections (e.g., "P0 React Compiler")
3. **After completion**: Update status and check items
4. **Quarterly review**: Re-evaluate priorities based on project needs

---

_Related_:

- `references/frontend-react-2026.md`
- `references/backend-nestjs-2026.md`
- `references/database-postgresql-2026.md`
- `references/testing-2026.md`
