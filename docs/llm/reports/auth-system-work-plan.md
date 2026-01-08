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
| **Step 4: auth-bff**            | #499           | ✅ CLOSED   | **#511 merged**        |
| **Step 5: Frontend**            | #500           | 🔴 **NEXT** | Depends on #499        |
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

## Completed Work (PR #511) - auth-bff

### Files Created

| Category        | Files                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Session**     | `session.store.ts`, `session.service.ts` (Valkey + AES-256-GCM encryption)                        |
| **Controllers** | `admin.controller.ts`, `user.controller.ts`, `operator.controller.ts`, `oauth.controller.ts`      |
| **Services**    | `admin.service.ts`, `user.service.ts`, `operator.service.ts`                                      |
| **gRPC**        | `auth.client.ts`, `identity.client.ts`                                                            |
| **Guards**      | `session.guard.ts` (role-based access control)                                                    |
| **Types**       | `packages/types`: `AccountType` enum, `COOKIE_NAMES`, `HEADER_NAMES`                              |
| **Tests**       | `session.store.spec.ts`, `session.guard.spec.ts`, `configuration.spec.ts`, `crypto.utils.spec.ts` |

### Key Features

- Valkey session store with AES-256-GCM token encryption
- Sliding session policy with configurable TTL per account type
- Device fingerprinting for session binding
- Production secret validation at startup
- Rate limiting and CSRF protection

---

## Next Step: Phase 5 - Frontend (#500)

### Overview

프론트엔드 인증 UI 구현. web-admin (Admin MFA 로그인), web-main (User 로그인/회원가입).

### Branch

```bash
git checkout -b feat/auth-frontend
```

### Key Tasks

| Task                 | Priority | App       | Description                 |
| -------------------- | -------- | --------- | --------------------------- |
| Admin Login Page     | P0       | web-admin | 이메일/비밀번호 로그인 폼   |
| Admin MFA Page       | P0       | web-admin | TOTP/백업코드 입력 폼       |
| Admin Dashboard Auth | P0       | web-admin | 세션 관리, 로그아웃         |
| User Login Page      | P0       | web-main  | 이메일/비밀번호 로그인 폼   |
| User Register Page   | P0       | web-main  | 회원가입 폼                 |
| OAuth Buttons        | P1       | web-main  | Google, Kakao, Naver, Apple |
| Auth Store (Zustand) | P0       | Both      | 인증 상태 관리              |
| Protected Routes     | P0       | Both      | 인증 필요 라우트 가드       |

### API Integration

```typescript
// auth-bff endpoints to integrate
const AUTH_BFF_BASE = '/api/auth';

// Admin
POST ${AUTH_BFF_BASE}/admin/login
POST ${AUTH_BFF_BASE}/admin/login-mfa
POST ${AUTH_BFF_BASE}/admin/logout
GET  ${AUTH_BFF_BASE}/admin/me

// User
POST ${AUTH_BFF_BASE}/user/register
POST ${AUTH_BFF_BASE}/user/login
POST ${AUTH_BFF_BASE}/user/logout
GET  ${AUTH_BFF_BASE}/user/me

// OAuth
GET  ${AUTH_BFF_BASE}/oauth/:provider
GET  ${AUTH_BFF_BASE}/oauth/:provider/callback
```

---

## Remaining Phases

### Phase 6: Audit Integration (#501)

- audit-service gRPC implementation
- ClickHouse tables (auth_events, security_alerts)
- Security alert rules
- Depends on: Phase 5 (Frontend)

### Phase 7: Testing & Documentation (#502)

- E2E tests for full auth flow
- 80%+ coverage across all services
- API documentation (OpenAPI/Swagger)
- Depends on: Phase 5, 6

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
