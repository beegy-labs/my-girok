# Enterprise Auth System Work Plan

> **Epic**: #496 | **Created**: 2026-01-08 | **Branch**: `feat/enterprise-auth`

## Quick Reference

```bash
# 작업 시작 전 읽어야 할 문서
cat docs/llm/reports/enterprise-auth-system-design.md  # 전체 설계
cat docs/llm/reports/auth-system-work-plan.md          # 이 문서
```

---

## 현재 진행 상태

| Step                          | Status                     | PRs              |
| ----------------------------- | -------------------------- | ---------------- |
| Step 1: DB Migration          | ✅ PR 생성 완료 (검토 중)  | #503, #504, #505 |
| Step 2: Proto 정의            | ✅ PR 생성 완료 (검토 중)  | #506, #507, #508 |
| Step 3-1: auth-service gRPC   | ⏳ 대기 (Step 1,2 머지 후) | -                |
| Step 3-2: identity+audit gRPC | ⏳ 대기                    | -                |
| Step 4: auth-bff              | ⏳ 대기                    | -                |
| Step 5: Frontend              | ⏳ 대기                    | -                |
| Step 6: Test & Docs           | ⏳ 대기                    | -                |

### 머지 순서 (충돌 주의)

```
1. #505 (identity session context) - 독립적
2. #503 (admin sessions) - 먼저
3. #504 (operator assignments) - #503 머지 후 rebase 필요!
4. #506, #507, #508 (Proto) - 순서 무관
```

---

## 작업 순서 및 PR 계획

### Step 1: Database Migration (3개 병렬) ✅ 완료

| Task                                                                                     | Branch                              | PR       |
| ---------------------------------------------------------------------------------------- | ----------------------------------- | -------- |
| auth_db: admin_sessions, admin_mfa_configs, admin_password_history, admin_login_attempts | `feat/auth-admin-sessions-db`       | **#503** |
| auth_db: operator_assignments, operator_assignment_permissions                           | `feat/auth-operator-assignments-db` | **#504** |
| identity_db: sessions 컬럼 추가                                                          | `feat/identity-session-context-db`  | **#505** |

**생성된 파일**:

- `services/auth-service/migrations/20260108000000_add_admin_auth_tables.sql`
- `services/auth-service/migrations/20260108000001_add_operator_assignments.sql`
- `services/identity-service/migrations/identity/20260108000000_add_session_context.sql`

**검증**:

- [x] Prisma generate 성공
- [ ] 마이그레이션 적용 성공 (머지 후 검증)
- [ ] 기존 데이터 무결성 (머지 후 검증)

---

### Step 2: Proto 정의 (3개 병렬) ✅ 완료

| Task                                                    | Branch                    | PR       |
| ------------------------------------------------------- | ------------------------- | -------- |
| auth.proto: Admin Auth/MFA/Session, Operator Assignment | `feat/auth-proto-admin`   | **#506** |
| identity.proto: MFA, Password 메소드                    | `feat/identity-proto-mfa` | **#507** |
| audit.proto: AuthEvent (신규 생성)                      | `feat/audit-proto`        | **#508** |

**생성/수정된 파일**:

- `packages/proto/auth/v1/auth.proto` (Admin 메소드 추가)
- `packages/proto/identity/v1/identity.proto` (MFA/Password 메소드 추가)
- `packages/proto/audit/v1/audit.proto` (신규 생성)

**검증**:

- [ ] Proto 컴파일 성공 (머지 후 proto:generate 실행)
- [ ] 타입 생성 확인

---

### Step 3-1: auth-service gRPC (단일)

| Task                                                            | Branch                         | PR Target |
| --------------------------------------------------------------- | ------------------------------ | --------- |
| AdminAuth, AdminMfa, AdminSession, OperatorAssignment gRPC 구현 | `feat/auth-service-admin-grpc` | develop   |

**작업 내용**:

- AdminAuthGrpcController
- AdminAuthService, AdminMfaService, AdminSessionService
- OperatorAssignmentService
- Unit 테스트

**검증**:

- [ ] gRPC 메소드 동작
- [ ] 테스트 통과 (80%+)

---

### Step 3-2: identity + audit gRPC (2개 병렬)

| Task                                 | Branch                               | PR Target |
| ------------------------------------ | ------------------------------------ | --------- |
| identity-service: MFA, Password gRPC | `feat/identity-service-mfa-grpc`     | develop   |
| audit-service: AuthEvent gRPC        | `feat/audit-service-auth-event-grpc` | develop   |

**작업 내용**:

- identity: MfaService, PasswordService gRPC 메소드
- audit: AuditGrpcController, AuthEventService, ClickHouse 테이블

**검증**:

- [ ] gRPC 메소드 동작
- [ ] 테스트 통과

---

### Step 4: auth-bff 서비스 (단일 - XL)

| Task               | Branch          | PR Target |
| ------------------ | --------------- | --------- |
| auth-bff 전체 구현 | `feat/auth-bff` | develop   |

**작업 내용**:

1. NestJS 서비스 scaffolding
2. Session management (Valkey)
3. REST endpoints:
   - `/user/*` (login, register, logout, refresh, mfa)
   - `/admin/*` (login, login-mfa, logout, sessions)
   - `/operator/*` (login, logout)
   - `/oauth/*` (providers, callback)
4. Security (Rate limiting, CSRF, Cookie)
5. gRPC clients (identity, auth, legal, audit)
6. Dockerfile, K8s manifests

**검증**:

- [ ] 모든 REST 엔드포인트 동작
- [ ] 세션 관리 동작
- [ ] Rate limiting 동작
- [ ] 테스트 통과 (80%+)

---

### Step 5: Frontend Integration (3개 병렬)

| Task                         | Branch                        | PR Target |
| ---------------------------- | ----------------------------- | --------- |
| web-admin: 로그인/MFA UI     | `feat/web-admin-auth-bff`     | develop   |
| web-main: 로그인/회원가입    | `feat/web-main-auth-bff`      | develop   |
| audit-service: auth-bff 연동 | `feat/audit-auth-integration` | develop   |

**작업 내용**:

- web-admin: API client, Login/MFA 페이지, Session 관리
- web-main: API client, Login/Register 페이지, OAuth
- audit: auth-bff에서 이벤트 로깅 호출

**검증**:

- [ ] 로그인/로그아웃 동작
- [ ] MFA 플로우 동작
- [ ] Audit 로그 기록 확인

---

### Step 6: Testing & Documentation (병렬)

| Task       | Branch                | PR Target |
| ---------- | --------------------- | --------- |
| E2E 테스트 | `feat/auth-e2e-tests` | develop   |
| 문서화     | `feat/auth-docs`      | develop   |

**검증**:

- [ ] E2E 테스트 통과
- [ ] 문서 완성

---

## 서비스 구조 요약

```
┌─────────────────────────────────────────────────────┐
│                   auth-bff (:3010)                   │
│        REST API + Session (Valkey) + Cookie          │
└──────────────┬──────────────┬───────────────────────┘
               │ gRPC         │ gRPC
               ▼              ▼
┌──────────────────────┐  ┌──────────────────────┐
│  identity-service    │  │    auth-service      │
│  (:3005)             │  │    (:3001)           │
│                      │  │                      │
│  • User 계정/세션    │  │  • Admin 계정/세션   │
│  • MFA (User)        │  │  • Admin MFA         │
│  • Password          │  │  • Operator 할당     │
│  • Device            │  │  • RBAC              │
│                      │  │                      │
│  identity_db         │  │  auth_db             │
└──────────────────────┘  └──────────────────────┘
               │                    │
               └────────┬───────────┘
                        │ gRPC
                        ▼
              ┌──────────────────┐
              │  audit-service   │
              │  (:3004)         │
              │                  │
              │  • Auth Events   │
              │  • Security Logs │
              │                  │
              │  ClickHouse      │
              └──────────────────┘
```

## Account Type 요약

| Type         | DB                                                  | Session DB                              | MFA          |
| ------------ | --------------------------------------------------- | --------------------------------------- | ------------ |
| **User**     | identity_db.accounts                                | identity_db.sessions                    | Optional     |
| **Operator** | identity_db.accounts + auth_db.operator_assignments | identity_db.sessions (context=OPERATOR) | Optional     |
| **Admin**    | auth_db.admins                                      | auth_db.admin_sessions                  | **Required** |

---

## GitHub Issues

| Phase   | Issue | Title                                 |
| ------- | ----- | ------------------------------------- |
| Epic    | #496  | Enterprise Auth System Implementation |
| Phase 1 | #497  | Database Migration                    |
| Phase 2 | #498  | Proto & gRPC Implementation           |
| Phase 3 | #499  | auth-bff Service                      |
| Phase 4 | #500  | Frontend Integration                  |
| Phase 5 | #501  | Audit Integration                     |
| Phase 6 | #502  | Testing & Documentation               |

---

## 시작 명령어

```bash
# Step 1 시작 (DB Migration - 3개 중 선택)
git checkout -b feat/auth-admin-sessions-db
# 또는
git checkout -b feat/auth-operator-assignments-db
# 또는
git checkout -b feat/identity-session-context-db

# 작업 후 PR 생성
gh pr create --title "feat(auth): add admin sessions tables" --body "Part of #496, #497"
```

---

## /clear 후 작업 요청 가이드

### 시작 프롬프트

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step X 진행해줘
```

### Step별 요청 프롬프트

#### Step 1: Database Migration (3개 병렬)

```
# Step 1, 2는 완료됨 - 아래 "검토 대기 PR" 섹션 참고
```

#### Step 3-1: auth-service gRPC (단일)

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step 3-1 진행해줘
auth-service에 AdminAuth, AdminMfa, OperatorAssignment gRPC 구현해줘
브랜치: feat/auth-service-admin-grpc
```

#### Step 3-2: identity + audit gRPC (2개 병렬)

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step 3-2 진행해줘
identity-service MFA gRPC와 audit-service AuthEvent gRPC 병렬로 구현해줘
```

#### Step 4: auth-bff (단일 - XL)

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step 4 auth-bff 진행해줘
브랜치: feat/auth-bff

# 규모가 크므로 단계별 요청 가능:
# 4-1: 서비스 scaffolding + Session 관리
# 4-2: User endpoints
# 4-3: Admin endpoints
# 4-4: Operator + OAuth endpoints
# 4-5: Security + gRPC clients
```

#### Step 5: Frontend Integration (3개 병렬)

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step 5 진행해줘
web-admin, web-main, audit 연동 병렬로 진행하고 각각 PR 생성해줘

# 개별 진행
docs/llm/reports/auth-system-work-plan.md 읽고
web-admin auth-bff 연동해줘 (로그인, MFA)
브랜치: feat/web-admin-auth-bff
```

#### Step 6: Testing & Documentation

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step 6 진행해줘
E2E 테스트와 문서화 병렬로 진행해줘
```

### PR 생성 요청

```
# 작업 완료 후
현재 작업 PR 생성해줘
- base: develop
- Issue 연결: #497 (해당 Phase issue)
```

### 작업 상태 확인

```
# Epic 상태 확인
gh issue view 496

# 특정 Phase 확인
gh issue view 497  # Phase 1
```

### 주의사항

1. **병렬 작업 시**: "병렬로 진행하고 각각 PR 생성해줘" 명시
2. **단일 작업 시**: 브랜치명 명시
3. **대규모 작업 (auth-bff)**: 단계별로 나눠서 요청 가능
4. **PR 생성**: 작업 완료 후 별도 요청

---

## 검토 대기 PR 목록 (2026-01-08)

### Step 1: DB Migration PRs

| PR                                                      | Title                                | Branch                              | 검토 포인트                                                                                   |
| ------------------------------------------------------- | ------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| [#503](https://github.com/beegy-labs/my-girok/pull/503) | feat(auth): add admin auth tables    | `feat/auth-admin-sessions-db`       | admin_mfa_configs, admin_sessions, admin_password_history, admin_login_attempts 테이블        |
| [#504](https://github.com/beegy-labs/my-girok/pull/504) | feat(auth): add operator assignments | `feat/auth-operator-assignments-db` | operator_assignments, operator_assignment_permissions 테이블. **⚠️ #503 머지 후 rebase 필요** |
| [#505](https://github.com/beegy-labs/my-girok/pull/505) | feat(identity): add session context  | `feat/identity-session-context-db`  | sessions 테이블에 session_context, service_id, operator_assignment_id 컬럼                    |

### Step 2: Proto PRs

| PR                                                      | Title                                     | Branch                    | 검토 포인트                                         |
| ------------------------------------------------------- | ----------------------------------------- | ------------------------- | --------------------------------------------------- |
| [#506](https://github.com/beegy-labs/my-girok/pull/506) | feat(proto): add admin auth to auth.proto | `feat/auth-proto-admin`   | Admin Login/MFA/Session, Operator Assignment 메소드 |
| [#507](https://github.com/beegy-labs/my-girok/pull/507) | feat(proto): add MFA to identity.proto    | `feat/identity-proto-mfa` | MFA, Password, Session Context 메소드               |
| [#508](https://github.com/beegy-labs/my-girok/pull/508) | feat(proto): add audit.proto              | `feat/audit-proto`        | AuthEvent, SecurityEvent, AdminAuditLog (신규 파일) |

### 머지 순서 권장

```bash
# 1. 독립적인 PR 먼저
gh pr merge 505 --squash  # identity session context
gh pr merge 506 --squash  # auth.proto
gh pr merge 507 --squash  # identity.proto
gh pr merge 508 --squash  # audit.proto

# 2. 충돌 주의 PR
gh pr merge 503 --squash  # auth admin sessions

# 3. rebase 후 머지
git checkout feat/auth-operator-assignments-db
git rebase develop
git push -f
gh pr merge 504 --squash  # operator assignments
```

---

## /clear 후 다음 작업 프롬프트

### PR 머지 완료 후 Step 3 진행

```
docs/llm/reports/auth-system-work-plan.md 읽고 Step 3-1 auth-service gRPC 진행해줘
```

### PR 머지 상태 확인

```
gh pr list --state open --json number,title,state
```

---

## 관련 문서

- 전체 설계: `docs/llm/reports/enterprise-auth-system-design.md`
- Identity Platform: `docs/llm/policies/identity-platform.md`
- Security: `docs/llm/policies/security.md`
