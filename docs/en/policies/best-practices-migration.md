# Best Practices Migration Guide

> Guide for applying 2026 best practices to the codebase

**Updated**: 2026-01-22

## Overview

This document tracks code changes needed to align with 2026 best practices from the `docs/llm/references/` documentation.

**Version Reference**: `references/package-versions-2026.md`

## Package Version Status

| Package           | Current | Latest Stable | Status |
| ----------------- | ------- | ------------- | ------ |
| React             | 19.2.3  | 19.2.3        | ✅     |
| TypeScript        | 5.9.3   | 5.9.3         | ✅     |
| Vite              | 7.3.1   | 7.3.1         | ✅     |
| Vitest            | 4.0.17  | 4.0.17        | ✅     |
| NestJS            | 11.1.12 | 11.1.12       | ✅     |
| Prisma            | 7.2.0   | 7.2.0         | ✅     |
| ClickHouse Client | 1.16.0  | 1.16.0        | ✅     |
| Tailwind          | 4.1.18  | 4.1.18        | ✅     |
| ESLint            | 9.39.2  | 9.39.2        | ✅     |

## Migration Status Overview

| Category            | Status     | Priority |
| ------------------- | ---------- | -------- |
| Package Versions    | 🟢 Updated | -        |
| Frontend (React 19) | 🟡 Partial | High     |
| Backend (NestJS)    | 🟢 Aligned | -        |
| Database            | 🟡 Partial | Medium   |
| Testing             | 🟡 Partial | Medium   |
| Security            | 🟢 Aligned | -        |
| CI/CD               | 🟢 Aligned | -        |

---

## Frontend (React 19)

**Reference**: `references/frontend-react-2026.md`

### React Compiler Adoption

| Current                         | Target                          | Impact |
| ------------------------------- | ------------------------------- | ------ |
| Manual memo/useMemo/useCallback | React Compiler auto-memoization | High   |

**Action Items**:

- [ ] Enable React Compiler in vite.config.ts
- [ ] Remove manual memo() wraps
- [ ] Remove useMemo where only for memoization
- [ ] Remove useCallback where only for memoization
- [ ] Keep useMemo/useCallback for semantic purposes

**Affected Directories**:

- `apps/web-girok/src/`
- `apps/web-admin/src/`
- `apps/storybook/`

### use() Hook for Data Fetching

| Current                    | Target              | Impact |
| -------------------------- | ------------------- | ------ |
| useEffect + useState fetch | use() with Suspense | Medium |

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

- [ ] Worker Threads for CPU-heavy tasks (PDF generation, image processing)
- [ ] Connection pooling audit for high-traffic services

---

## Database (PostgreSQL)

**Reference**: `references/database-postgresql-2026.md`

### UUIDv7 Migration

| Current              | Target                   | Impact |
| -------------------- | ------------------------ | ------ |
| UUIDv4 (some tables) | UUIDv7 for internal keys | Medium |
| TEXT IDs (legacy)    | UUID type                | Low    |

**Action Items**:

- [ ] Audit tables using UUIDv4 for primary keys
- [ ] Create migration plan for UUIDv7 adoption
- [ ] Keep UUIDv4 for external/public-facing IDs (privacy)
- [ ] Update Prisma schema to use gen_random_uuidv7() default

---

## Testing

**Reference**: `references/testing-2026.md`

### Coverage

| Current      | Target      | Gap  |
| ------------ | ----------- | ---- |
| ~70% average | 80% minimum | +10% |

**Action Items**:

- [ ] Increase unit test coverage to 80%
- [ ] Add integration tests for API contracts
- [ ] Implement test fixtures for reusable data
- [ ] Add Playwright E2E for critical flows

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

- [ ] Add @cyclonedx/cyclonedx-npm to CI
- [ ] Generate SBOM on releases
- [ ] Integrate with dependency scanning

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
| ~~P6~~   | ~~Prisma 7 migration~~  | -      | ✅ Done              |

---

## How to Use This Document

1. **Before starting migration**: Review relevant sections
2. **Request changes**: Reference specific items (e.g., "P0 React Compiler")
3. **After completion**: Update status and check items
4. **Quarterly review**: Re-evaluate priorities based on project needs

## Related Documentation

- `docs/en/references/frontend-react-2026.md`
- `docs/en/references/backend-nestjs-2026.md`
- `docs/en/references/database-postgresql-2026.md`
- `docs/en/references/testing-2026.md`

---

_This document is auto-generated from `docs/llm/policies/best-practices-migration.md`_
