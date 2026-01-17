# Phase 7: OAuth Testing & Security

> **Status**: Planning | **Priority**: High | **Target**: 80%+ coverage

## Overview

Phase 7 focuses on comprehensive testing and security auditing of OAuth authentication flows implemented in Phases 1-5. This includes E2E tests, integration tests, and security validation.

## Current Test Coverage

### Backend Services (✅ Complete)

| Service      | File                            | Lines | Coverage |
| ------------ | ------------------------------- | ----- | -------- |
| auth-service | oauth-config.service.spec.ts    | 437   | ✅       |
| auth-service | oauth-config.controller.spec.ts | 345   | ✅       |
| auth-bff     | oauth.controller.spec.ts        | 233   | ✅       |
| **Total**    | **3 files**                     | 1,015 | **90%+** |

**Coverage includes:**

- Provider enable/disable toggling
- Credentials encryption/decryption
- CRUD operations for OAuth configs
- Callback URL validation
- MASTER role enforcement

### Frontend Components (⚠️ Partial)

| App       | File                       | Lines | Tests | Status |
| --------- | -------------------------- | ----- | ----- | ------ |
| web-admin | OAuthProviderCard.test.tsx | 130   | 8     | ✅     |
| web-girok | oauth.spec.ts (E2E)        | 245   | 20+   | ⚠️     |
| web-admin | OAuthSettingsPage (E2E)    | -     | 0     | ❌     |
| **Total** | **2 files**                | 375   | 28+   | ⚠️     |

**Issues:**

- Many E2E tests are skipped (OAuth initiation, MFA required)
- No E2E tests for OAuth Settings management page
- Missing integration tests for provider toggle flows

## Phase 7 Task Breakdown

### 1. E2E Tests for OAuth Flows

#### 1.1 Un-skip and Complete Existing Tests

**File**: `apps/web-girok/e2e/oauth.spec.ts`

**Tasks:**

- [ ] Un-skip OAuth initiation tests (4 providers)
- [ ] Un-skip OAuth redirect after success tests
- [ ] Un-skip OAuth MFA required tests
- [ ] Add test data factories for OAuth responses
- [ ] Mock OAuth provider responses using Playwright

**Estimated Tests**: ~12 additional tests

#### 1.2 Provider Enable/Disable E2E Tests

**New File**: `apps/web-girok/e2e/oauth-providers.spec.ts`

**Tests:**

- [ ] Login page should only show enabled OAuth providers
- [ ] Disabled providers should not be clickable
- [ ] Dynamic provider loading based on enabled status
- [ ] Error handling when all OAuth providers are disabled

**Estimated Tests**: ~8 tests

#### 1.3 OAuth Settings Management E2E Tests

**New File**: `apps/web-admin/e2e/oauth-settings.e2e-spec.ts`

**Tests:**

- [ ] Load OAuth Settings page (requires MASTER role)
- [ ] Display all 4 OAuth providers (Google, Kakao, Naver, Apple)
- [ ] Toggle provider enable/disable
- [ ] Update provider credentials (client ID, secret, callback URL)
- [ ] Validate callback URL (reject invalid domains)
- [ ] Verify encrypted secrets are masked (show only last 4 chars)
- [ ] Refresh provider list
- [ ] Error handling for invalid credentials
- [ ] Role-based access control (non-MASTER should be forbidden)

**Estimated Tests**: ~15 tests

**Total E2E Tests**: ~35 new tests

### 2. Integration Tests

#### 2.1 Provider Toggle Integration Tests

**New File**: `services/auth-service/test/integration/oauth-toggle.integration.spec.ts`

**Tests:**

- [ ] Toggle provider from disabled to enabled
- [ ] Toggle provider from enabled to disabled
- [ ] Verify database state after toggle
- [ ] Verify audit log entry is created
- [ ] Test concurrent toggle requests (race condition)
- [ ] Test LOCAL provider cannot be disabled

**Estimated Tests**: ~10 tests

#### 2.2 Credentials Update Integration Tests

**New File**: `services/auth-service/test/integration/oauth-credentials.integration.spec.ts`

**Tests:**

- [ ] Update credentials with encryption
- [ ] Verify encrypted secret in database
- [ ] Verify decryption returns original secret
- [ ] Update only clientId (secret unchanged)
- [ ] Update only clientSecret (clientId unchanged)
- [ ] Update only callbackUrl
- [ ] Verify audit log for credential changes
- [ ] Test callback URL validation (reject evil.com)
- [ ] Test callback URL validation (accept localhost, girok.dev)

**Estimated Tests**: ~12 tests

#### 2.3 End-to-End Provider Flow Integration

**New File**: `services/auth-bff/test/integration/oauth-flow.integration.spec.ts`

**Tests:**

- [ ] BFF fetches enabled providers from auth-service
- [ ] BFF initiates OAuth with enabled provider
- [ ] BFF rejects OAuth initiation for disabled provider
- [ ] BFF validates callback URL from auth-service
- [ ] Error propagation from auth-service to BFF

**Estimated Tests**: ~8 tests

**Total Integration Tests**: ~30 tests

### 3. Security Audit

#### 3.1 Encryption Verification

**New File**: `services/auth-service/test/security/oauth-encryption.security.spec.ts`

**Tests:**

- [ ] Verify all clientSecret fields are encrypted in database
- [ ] Verify encryption uses AES-256-GCM
- [ ] Verify decryption returns original plaintext
- [ ] Verify encryption key rotation (if applicable)
- [ ] Test encryption failure handling
- [ ] Verify no plaintext secrets in logs
- [ ] Verify no plaintext secrets in API responses

**Estimated Tests**: ~10 tests

#### 3.2 Callback URL Validation Security

**New File**: `services/auth-service/test/security/oauth-callback-validation.security.spec.ts`

**Tests:**

- [ ] Reject callback URL with external domain (evil.com)
- [ ] Reject callback URL with protocol-relative URL (//evil.com)
- [ ] Accept localhost URLs (http://localhost:4005/oauth/google/callback)
- [ ] Accept girok.dev URLs (https://girok.dev/oauth/google/callback)
- [ ] Accept subdomains (https://auth-bff.girok.dev/oauth/google/callback)
- [ ] Reject open redirect attempts
- [ ] Test URL parsing edge cases (query params, fragments)

**Estimated Tests**: ~10 tests

#### 3.3 RBAC Enforcement Security

**New File**: `apps/web-admin/e2e/oauth-rbac.security.spec.ts`

**Tests:**

- [ ] MASTER role can access OAuth Settings page
- [ ] ADMIN role is forbidden from OAuth Settings page
- [ ] USER role is forbidden from OAuth Settings page
- [ ] Unauthenticated users are redirected to login
- [ ] MASTER role can toggle providers
- [ ] MASTER role can update credentials
- [ ] Non-MASTER roles receive 403 Forbidden

**Estimated Tests**: ~10 tests

#### 3.4 Penetration Testing Checklist

**Manual Testing (Document results)**

- [ ] SQL injection attempts in OAuth config fields
- [ ] XSS attempts in provider names and descriptions
- [ ] CSRF token validation for OAuth settings updates
- [ ] Rate limiting on OAuth endpoints
- [ ] Session fixation prevention
- [ ] Clickjacking protection (X-Frame-Options)
- [ ] Content Security Policy headers
- [ ] OAuth state parameter validation (CSRF protection)
- [ ] Token expiration and refresh flows
- [ ] Brute force protection on OAuth callbacks

**Total Security Tests**: ~30 automated tests + manual checklist

## Test Execution Plan

### Phase 7.1: E2E Tests (Week 1)

1. Un-skip existing OAuth E2E tests
2. Create OAuth Settings E2E tests
3. Add provider enable/disable E2E tests
4. Run full E2E suite and verify coverage

### Phase 7.2: Integration Tests (Week 2)

1. Provider toggle integration tests
2. Credentials update integration tests
3. BFF-to-auth-service integration tests
4. Run integration tests with real database

### Phase 7.3: Security Audit (Week 3)

1. Encryption verification tests
2. Callback URL validation tests
3. RBAC enforcement tests
4. Manual penetration testing
5. Security audit report

## Success Criteria

| Category          | Target   | Current | Status |
| ----------------- | -------- | ------- | ------ |
| E2E Tests         | 35+      | 20      | ⚠️     |
| Integration Tests | 30+      | 0       | ❌     |
| Security Tests    | 30+      | 0       | ❌     |
| Coverage          | 80%+     | 90%+    | ✅     |
| Manual Audit      | Complete | 0%      | ❌     |

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Start test databases
docker-compose up -d postgres redis

# Run migrations
pnpm db:migrate
```

### Running Tests

```bash
# Unit tests (already passing)
cd services/auth-service && pnpm test
cd services/auth-bff && pnpm test

# Integration tests (to be added)
cd services/auth-service && pnpm test test/integration
cd services/auth-bff && pnpm test test/integration

# E2E tests
cd apps/web-girok && pnpm test:e2e
cd apps/web-admin && pnpm test:e2e

# Security tests
cd services/auth-service && pnpm test test/security
cd apps/web-admin && pnpm test:e2e test/security
```

## Documentation Updates

After completing Phase 7:

- [ ] Update `docs/test-coverage.md` with new test counts
- [ ] Create security audit report in `docs/llm/reports/oauth-security-audit.md`
- [ ] Update `.ai/services/auth-service.md` with security notes
- [ ] Update `.ai/apps/web-admin.md` with OAuth Settings documentation

## Related Documentation

- **Testing Policy**: `docs/llm/policies/testing.md`
- **Security Policy**: `docs/llm/policies/security.md`
- **OAuth Architecture**: `.ai/services/auth-service.md` (OAuth section)
- **BFF OAuth**: `.ai/services/auth-bff.md`

## Next Steps

After Phase 7 completion:

1. **Phase 8**: Performance testing and optimization
2. **Phase 9**: Production deployment
3. **Phase 10**: Monitoring and alerting setup

---

**Ready to start?** Begin with Phase 7.1 - E2E Tests
