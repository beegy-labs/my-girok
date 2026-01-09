# Test Coverage Status

> **Last Updated**: 2026-01-09 | **Target**: 80% minimum

## Overview

This document tracks test coverage status across all services and applications.

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
| web-main  | Vitest    | 75+   | -        | ✅     |
| web-admin | Vitest    | 18    | -        | ✅     |

### web-main Test Breakdown

| Component           | Tests |
| ------------------- | ----- |
| OAuthCallbackPage   | 13    |
| MfaVerificationPage | 17    |
| SecuritySettings    | 22    |
| SessionsPage        | 23    |

## Integration Tests

| Category                    | Tests  | Location                                                               |
| --------------------------- | ------ | ---------------------------------------------------------------------- |
| auth-bff ↔ auth-service     | 20+    | `services/auth-bff/test/integration/auth-grpc.integration.spec.ts`     |
| auth-bff ↔ identity-service | 20+    | `services/auth-bff/test/integration/identity-grpc.integration.spec.ts` |
| auth-bff ↔ audit-service    | 20+    | `services/auth-bff/test/integration/audit-grpc.integration.spec.ts`    |
| **Total**                   | **61** | -                                                                      |

## E2E Tests

| Flow      | Tests  | Location                             |
| --------- | ------ | ------------------------------------ |
| Login     | 20+    | `apps/web-main/e2e/login.spec.ts`    |
| MFA       | 20+    | `apps/web-main/e2e/mfa.spec.ts`      |
| OAuth     | 20+    | `apps/web-main/e2e/oauth.spec.ts`    |
| Sessions  | 20+    | `apps/web-main/e2e/sessions.spec.ts` |
| **Total** | **87** | -                                    |

## Security Tests

| Category     | Tests | Location                                                 |
| ------------ | ----- | -------------------------------------------------------- |
| OWASP Top 10 | 38    | `services/auth-bff/test/security/owasp-security.spec.ts` |

### Security Test Coverage

- [x] Input validation / Injection prevention
- [x] Rate limiting verification
- [x] Session fixation prevention
- [x] CSRF protection
- [x] Secure cookie flags
- [x] Error handling (no sensitive data leakage)
- [x] Password policy enforcement

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
cd apps/web-main && pnpm test:e2e
```

## Pending Tests

### High Priority

- [ ] audit-service unit tests
- [ ] personal-service test coverage improvement
- [ ] analytics-service test coverage improvement

### Medium Priority

- [ ] web-admin additional component tests
- [ ] API rate limiting E2E tests

## Related Documentation

- Testing standards: `docs/llm/policies/testing.md`
- CI/CD pipeline: `.ai/ci-cd.md`
