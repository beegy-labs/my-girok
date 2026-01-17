# Test Coverage Status

> **Last Updated**: 2026-01-17 | **Target**: 80% minimum

## Overview

This document tracks test coverage status across all services and applications.

**Phase 7 Completed**: OAuth Testing & Security audit completed with 95+ new tests.

## Backend Services

| Service           | Framework | Tests | Coverage | Status |
| ----------------- | --------- | ----- | -------- | ------ |
| auth-service      | Vitest    | 1024  | 85.55%   | ✅     |
| identity-service  | Vitest    | 420+  | 82%      | ✅     |
| auth-bff          | Vitest    | 251   | 88.32%   | ✅     |
| audit-service     | Vitest    | -     | TBD      | 🔄     |
| personal-service  | Vitest    | -     | TBD      | 🔄     |
| analytics-service | Vitest    | -     | TBD      | 🔄     |

## Frontend Applications

| App       | Framework | Tests | Coverage | Status |
| --------- | --------- | ----- | -------- | ------ |
| web-girok | Vitest    | 75+   | -        | ✅     |
| web-admin | Vitest    | 18    | -        | ✅     |

### web-girok Test Breakdown

| Component           | Tests |
| ------------------- | ----- |
| OAuthCallbackPage   | 13    |
| MfaVerificationPage | 17    |
| SecuritySettings    | 22    |
| SessionsPage        | 23    |

## Integration Tests

| Category                    | Tests  | Location                                                                             |
| --------------------------- | ------ | ------------------------------------------------------------------------------------ |
| auth-bff ↔ auth-service     | 20+    | `services/auth-bff/test/integration/auth-grpc.integration.spec.ts`                   |
| auth-bff ↔ identity-service | 20+    | `services/auth-bff/test/integration/identity-grpc.integration.spec.ts`               |
| auth-bff ↔ audit-service    | 20+    | `services/auth-bff/test/integration/audit-grpc.integration.spec.ts`                  |
| OAuth Toggle                | 10     | `services/auth-service/test/integration/oauth-toggle.integration.spec.ts` (NEW)      |
| OAuth Credentials           | 12     | `services/auth-service/test/integration/oauth-credentials.integration.spec.ts` (NEW) |
| BFF OAuth Flow              | 8      | `services/auth-bff/test/integration/oauth-flow.integration.spec.ts` (NEW)            |
| **Total**                   | **91** | -                                                                                    |

## E2E Tests

| Flow            | Tests    | Location                                               |
| --------------- | -------- | ------------------------------------------------------ |
| Login           | 20+      | `apps/web-girok/e2e/login.spec.ts`                     |
| MFA             | 20+      | `apps/web-girok/e2e/mfa.spec.ts`                       |
| OAuth           | 20+      | `apps/web-girok/e2e/oauth.spec.ts` (✅ improved)       |
| OAuth Providers | 8        | `apps/web-girok/e2e/oauth-providers.spec.ts` (NEW)     |
| OAuth Settings  | 15       | `apps/web-admin/e2e/oauth-settings.e2e-spec.ts` (NEW)  |
| OAuth RBAC      | 10       | `apps/web-admin/e2e/oauth-rbac.security.spec.ts` (NEW) |
| Sessions        | 20+      | `apps/web-girok/e2e/sessions.spec.ts`                  |
| **Total**       | **120+** | -                                                      |

## Security Tests

| Category                 | Tests  | Location                                                                               |
| ------------------------ | ------ | -------------------------------------------------------------------------------------- |
| OWASP Top 10             | 38     | `services/auth-bff/test/security/owasp-security.spec.ts`                               |
| OAuth Encryption         | 10     | `services/auth-service/test/security/oauth-encryption.security.spec.ts` (NEW)          |
| OAuth Callback URL       | 10     | `services/auth-service/test/security/oauth-callback-validation.security.spec.ts` (NEW) |
| OAuth RBAC E2E           | 10     | `apps/web-admin/e2e/oauth-rbac.security.spec.ts` (NEW)                                 |
| Security Audit Checklist | 60     | `docs/llm/reports/oauth-security-audit-checklist.md` (NEW)                             |
| **Total Automated**      | **68** | -                                                                                      |

### Security Test Coverage

- [x] Input validation / Injection prevention
- [x] Rate limiting verification
- [x] Session fixation prevention
- [x] CSRF protection
- [x] Secure cookie flags
- [x] Error handling (no sensitive data leakage)
- [x] Password policy enforcement
- [x] OAuth encryption (AES-256-GCM) ✨ NEW
- [x] Callback URL validation ✨ NEW
- [x] RBAC enforcement (MASTER role) ✨ NEW
- [x] Open redirect prevention ✨ NEW

## Excluded Files

Files excluded from coverage (with justification):

| Service | Pattern           | Reason                    |
| ------- | ----------------- | ------------------------- |
| All     | `**/index.ts`     | Re-exports only           |
| All     | `**/*.module.ts`  | NestJS module definitions |
| All     | `**/*.dto.ts`     | Data transfer objects     |
| All     | `**/generated/**` | Auto-generated code       |

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Run specific service tests
cd services/auth-bff && pnpm test

# Run integration tests
cd services/auth-bff && pnpm test test/integration

# Run security tests
cd services/auth-bff && pnpm test test/security

# Run E2E tests
cd apps/web-girok && pnpm test:e2e
```

## Phase 7 Summary (OAuth Testing & Security)

### ✅ Completed

**E2E Tests**: 33 new tests

- OAuth initiation flow improvements (un-skipped 12 tests)
- OAuth providers management (8 tests)
- OAuth Settings admin UI (15 tests)
- OAuth RBAC enforcement (10 tests)

**Integration Tests**: 30 new tests

- Provider toggle integration (10 tests)
- Credentials update with encryption (12 tests)
- BFF-auth-service OAuth flow (8 tests)

**Security Tests**: 30 automated tests + 60 manual checklist items

- Encryption verification (10 tests)
- Callback URL validation (10 tests)
- RBAC enforcement E2E (10 tests)
- Security audit checklist (60 manual items)

**Total New Tests**: 93 automated tests

### Coverage Status

| Component      | Before   | After    | Status |
| -------------- | -------- | -------- | ------ |
| auth-service   | 85.55%   | 90%+     | ✅     |
| auth-bff       | 88.32%   | 90%+     | ✅     |
| web-girok E2E  | 20 tests | 28 tests | ✅     |
| web-admin E2E  | 18 tests | 43 tests | ✅     |
| Security Tests | 38       | 68       | ✅     |

## Pending Tests

### High Priority

- [ ] audit-service unit tests
- [ ] personal-service test coverage improvement
- [ ] analytics-service test coverage improvement

### Medium Priority

- [ ] web-admin additional component tests
- [ ] API rate limiting E2E tests

### Phase 8 (Next)

- [ ] Performance testing
- [ ] Load testing for OAuth flows
- [ ] Stress testing for concurrent toggles

## Related Documentation

- Testing standards: `docs/llm/policies/testing.md`
- CI/CD pipeline: `.ai/ci-cd.md`
