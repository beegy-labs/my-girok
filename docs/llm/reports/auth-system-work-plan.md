# Enterprise Auth System Work Plan

> **Epic**: #496 | **Created**: 2026-01-08 | **Last Updated**: 2026-01-08

## Quick Reference

```bash
# Reference docs
cat docs/llm/reports/enterprise-auth-system-design.md  # Full design (913 lines)
cat docs/llm/reports/auth-system-work-plan.md          # This file

# Check proto files
cat packages/proto/auth/v1/auth.proto      # Admin auth + Operator
cat packages/proto/identity/v1/identity.proto  # MFA + Password
cat packages/proto/audit/v1/audit.proto    # Audit logging
cat packages/proto/common/v1/common.proto  # Shared types (MfaMethod)
```

---

## Current Status

| Step                            | Issue          | Status      | PRs/Notes              |
| ------------------------------- | -------------- | ----------- | ---------------------- |
| Step 1: DB Migration            | #497           | ✅ CLOSED   | #503, #504, #505       |
| Step 2: Proto Definition        | (part of #498) | ✅ Merged   | #506, #507, #508, #509 |
| **Step 3-1: auth-service gRPC** | #498           | ✅ CLOSED   | **#510 merged**        |
| Step 3-2: identity+audit gRPC   | (part of #498) | ⏳ Optional | identity-service MFA   |
| **Step 4: auth-bff**            | #499           | 🔴 **NEXT** | Phase 3                |
| Step 5: Frontend                | #500           | 🔴 Pending  | Depends on #499        |
| Step 6: Audit Integration       | #501           | 🔴 Pending  | Depends on #499        |
| Step 7: Test & Docs             | #502           | 🔴 Pending  | Final phase            |

---

## Completed Work (PR #510)

### Files Created

| Category     | Files                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Utils**    | `totp.utils.ts`, `logging.utils.ts`, `validation.utils.ts`                                                        |
| **Crypto**   | `crypto.service.ts` (AES-256-GCM)                                                                                 |
| **Services** | `admin-session.service.ts`, `admin-mfa.service.ts`, `admin-password.service.ts`, `operator-assignment.service.ts` |
| **Types**    | `permission.types.ts`, `service-responses.ts`                                                                     |
| **Config**   | `constants.ts` (TOTP, Password, Lockout configs)                                                                  |
| **Tests**    | 383 tests (357 admin + 26 TOTP)                                                                                   |

### gRPC Methods Implemented (19 total)

```
Admin Auth (2): AdminLogin, AdminLoginMfa
Admin Session (5): ValidateSession, RefreshSession, Logout, RevokeAllSessions, GetActiveSessions
Admin MFA (4): SetupMfa, VerifyMfa, DisableMfa, RegenerateBackupCodes
Admin Password (2): ChangePassword, ForcePasswordChange
Operator Assignment (6): Assign, Revoke, Get, GetService, UpdatePermissions, GetPermissions
```

---

## Next Step: Phase 3 - auth-bff (#499)

### Overview

BFF 패턴 기반 인증 게이트웨이 서비스. 모든 클라이언트 인증 요청을 처리하고 세션 관리.

### Branch

```bash
git checkout -b feat/auth-bff-service
```

### Service Structure

```
services/auth-bff/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── session/          # Valkey session store
│   ├── user/             # User auth endpoints
│   ├── admin/            # Admin auth endpoints
│   ├── operator/         # Operator auth endpoints
│   ├── oauth/            # OAuth providers
│   └── grpc-clients/     # identity + auth + audit clients
├── Dockerfile
└── package.json
```

### Key Tasks

| Task                | Priority | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| Service Scaffolding | P0       | NestJS project, modules, config                     |
| Session Store       | P0       | Valkey-based BffSession management                  |
| Admin Endpoints     | P0       | `/admin/login`, `/admin/login-mfa`, `/admin/logout` |
| User Endpoints      | P0       | `/user/login`, `/user/register`, `/user/logout`     |
| Operator Endpoints  | P1       | `/operator/login`, `/operator/logout`               |
| OAuth               | P1       | Google, Kakao, Naver, Apple                         |
| Security            | P0       | Rate limiting, CSRF, cookies                        |
| gRPC Clients        | P0       | identity-service, auth-service clients              |

### Session Model (Valkey)

```typescript
interface BffSession {
  id: string;
  accountType: 'USER' | 'OPERATOR' | 'ADMIN';
  accountId: string;
  appSlug?: string;
  serviceId?: string;
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  deviceFingerprint: string;
  mfaVerified: boolean;
  createdAt: Date;
  expiresAt: Date;
}
```

### REST Endpoints

| Category | Endpoints                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Admin    | POST `/admin/login`, `/admin/login-mfa`, `/admin/logout`, `/admin/refresh`, GET `/admin/me`, `/admin/sessions` |
| User     | POST `/user/register`, `/user/login`, `/user/logout`, `/user/refresh`, GET `/user/me`                          |
| Operator | POST `/operator/login`, `/operator/logout`, `/operator/refresh`, GET `/operator/me`                            |
| OAuth    | GET `/oauth/:provider`, `/oauth/:provider/callback`                                                            |

---

## Remaining Phases

### Phase 4: Frontend (#500)

- web-admin: Admin login flow with MFA
- web-main: User login/register flow
- OAuth login buttons
- Depends on: Phase 3 (auth-bff)

### Phase 5: Audit Integration (#501)

- audit-service gRPC implementation
- ClickHouse tables (auth_events, security_alerts)
- Security alert rules
- Depends on: Phase 3 (auth-bff)

### Phase 6: Testing & Documentation (#502)

- E2E tests
- 80%+ coverage
- API documentation
- Depends on: Phase 4, 5

---

## /clear Workflow

When resuming work after `/clear`:

```bash
# 1. Read this file first
cat docs/llm/reports/auth-system-work-plan.md

# 2. Check current status
gh issue list --search "Phase" --state open

# 3. Start Phase 3
git checkout -b feat/auth-bff-service
gh issue view 499  # Full task list

# 4. Reference existing auth-service code
ls services/auth-service/src/admin/services/  # Pattern reference
cat services/auth-service/src/common/config/constants.ts  # Shared constants
```

---

## Known Issues

### Unrelated Test Failures

`pii-logging.interceptor.spec.ts` has 43 failing tests - not related to auth work. Tracked separately.

---

## Success Criteria

| Criteria           | Target  | Current       |
| ------------------ | ------- | ------------- |
| Test coverage      | 80%+    | ✅ 383 tests  |
| Build              | Pass    | ✅            |
| Login latency      | < 500ms | TBD (Phase 3) |
| Session validation | < 50ms  | TBD (Phase 3) |
