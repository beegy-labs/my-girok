# Enterprise Auth System Work Plan

> **Epic**: #496 | **Created**: 2026-01-08 | **Last Updated**: 2026-01-08

## Quick Reference

```bash
# Reference docs
cat docs/llm/reports/enterprise-auth-system-design.md  # Full design
cat docs/llm/reports/auth-system-work-plan.md          # This file
```

---

## Current Status

| Step                          | Status          | PRs              |
| ----------------------------- | --------------- | ---------------- |
| Step 1: DB Migration          | Review Complete | #503, #504, #505 |
| Step 2: Proto Definition      | Review Complete | #506, #507, #508 |
| Step 3-1: auth-service gRPC   | Pending (merge) | -                |
| Step 3-2: identity+audit gRPC | Pending         | -                |
| Step 4: auth-bff              | Pending         | -                |
| Step 5: Frontend              | Pending         | -                |
| Step 6: Test & Docs           | Pending         | -                |

---

## Code Review Summary (2026-01-08)

### Issues Fixed

| PR   | Issue                    | Fix                                                            |
| ---- | ------------------------ | -------------------------------------------------------------- |
| #503 | Missing CREATE TYPE      | Added admin_password_change_reason, admin_login_failure_reason |
| #503 | UUIDv7 policy violation  | Changed gen_random_uuid() to uuid_generate_v7()                |
| #503 | recovery_phone too short | Expanded VARCHAR(20) to VARCHAR(32)                            |
| #504 | UUIDv7 policy violation  | Changed gen_random_uuid() to uuid_generate_v7()                |
| #506 | Duplicate MfaMethod enum | Created common.proto, imported from common.v1                  |
| #507 | Duplicate MfaMethod enum | Imported MfaMethod from common.v1                              |
| #506 | Missing documentation    | Added comprehensive proto comments                             |

### New File Created

```
packages/proto/common/v1/common.proto  # Shared types (MfaMethod enum)
```

---

## Merge Order (Important)

```
1. #505 (identity session context) - Independent, merge first
2. #503 (admin sessions) - Contains uuid_generate_v7() function
3. #504 (operator assignments) - Depends on uuid_generate_v7(), rebase after #503
4. #506 (auth.proto) - Creates common.proto
5. #507 (identity.proto) - Also creates common.proto, resolve conflict with #506
6. #508 (audit.proto) - Independent
```

**Conflict Notes**:

- #503 and #504: Both modify `services/auth-service/prisma/schema.prisma`
- #506 and #507: Both create `packages/proto/common/v1/common.proto` (same content)

---

## PR Details

### Step 1: Database Migrations

#### PR #503: Admin Auth Tables

- **Branch**: `feat/auth-admin-sessions-db`
- **Files**:
  - `services/auth-service/migrations/20260108000000_add_admin_auth_tables.sql`
  - `services/auth-service/prisma/schema.prisma`
- **Tables**: admin_mfa_configs, admin_sessions, admin_password_history, admin_login_attempts
- **Fix Applied**: UUIDv7 function, enum types, recovery_phone length

#### PR #504: Operator Assignments

- **Branch**: `feat/auth-operator-assignments-db`
- **Files**:
  - `services/auth-service/migrations/20260108000001_add_operator_assignments.sql`
  - `services/auth-service/prisma/schema.prisma`
- **Tables**: operator_assignments, operator_assignment_permissions
- **Fix Applied**: UUIDv7 function

#### PR #505: Session Context

- **Branch**: `feat/identity-session-context-db`
- **Files**:
  - `services/identity-service/migrations/identity/20260108000000_add_session_context.sql`
  - `services/identity-service/prisma/identity/schema.prisma`
- **Changes**: Added session_context enum column to sessions table
- **Status**: No issues found

### Step 2: Proto Definitions

#### PR #506: Auth Proto (Admin + Operator)

- **Branch**: `feat/auth-proto-admin`
- **Files**:
  - `packages/proto/auth/v1/auth.proto`
  - `packages/proto/common/v1/common.proto` (new)
- **RPCs Added**: AdminLogin, AdminLoginMfa, AdminSetupMfa, AdminVerifyMfa, AssignOperator, etc.
- **Fix Applied**: MfaMethod moved to common.proto, documentation added

#### PR #507: Identity Proto (MFA)

- **Branch**: `feat/identity-proto-mfa`
- **Files**:
  - `packages/proto/identity/v1/identity.proto`
  - `packages/proto/common/v1/common.proto` (new)
- **RPCs Added**: SetupMfa, VerifyMfaSetup, VerifyMfaCode, DisableMfa, ChangePassword, etc.
- **Fix Applied**: MfaMethod imported from common.proto

#### PR #508: Audit Proto

- **Branch**: `feat/audit-proto`
- **Files**:
  - `packages/proto/audit/v1/audit.proto` (new)
- **RPCs Added**: LogAuthEvent, LogSecurityEvent, LogAdminAction, GenerateComplianceReport
- **Status**: No issues found, well-designed

---

## Next Steps (After Merge)

### Step 3-1: auth-service gRPC Implementation

```bash
# Branch: feat/auth-service-admin-grpc
# Target: develop
```

**Tasks**:

1. AdminAuthGrpcController
2. AdminAuthService (login, session management)
3. AdminMfaService (TOTP setup, verification)
4. AdminSessionService (token rotation)
5. OperatorAssignmentService
6. Unit tests (80%+ coverage)

### Step 3-2: identity-service & audit-service gRPC

```bash
# Branch: feat/identity-mfa-grpc
# Branch: feat/audit-service-grpc
```

---

## SSOT Recommendations

### Manageable via SSOT

| Component          | SSOT Path                     | Notes                        |
| ------------------ | ----------------------------- | ---------------------------- |
| MfaMethod enum     | common.proto                  | Single source, imported      |
| Auth patterns      | docs/llm/policies/auth.md     | Create policy doc            |
| Migration patterns | docs/llm/policies/database.md | Existing, follow UUIDv7 rule |
| Proto conventions  | .ai/rules.md                  | Add proto section            |

### Action Items for SSOT

1. **Create `docs/llm/policies/auth.md`** - Document admin vs user auth patterns
2. **Update `.ai/rules.md`** - Add proto file conventions (import common.proto for shared types)
3. **Update `docs/llm/policies/database.md`** - Enforce uuid_generate_v7() for all new migrations

---

## /clear Workflow

When resuming work after `/clear`:

```bash
# 1. Read this file first
cat docs/llm/reports/auth-system-work-plan.md

# 2. Check PR status
gh pr list --search "enterprise auth"

# 3. Continue with next step based on merge status
```
