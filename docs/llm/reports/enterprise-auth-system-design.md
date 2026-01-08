# Enterprise Auth System Design Report

> **Version**: 1.0 | **Date**: 2026-01-08 | **Status**: Draft

---

## 1. Executive Summary

### 1.1 Purpose

모든 서비스(my-girok, vero, future apps)에서 공통으로 사용할 엔터프라이즈급 인증 시스템 설계.
PoC 개발 시 인증 재구현 없이 빠른 온보딩을 지원하는 공통 인프라 구축.

### 1.2 Key Decisions

| 결정 사항     | 선택                           | 근거                               |
| ------------- | ------------------------------ | ---------------------------------- |
| Admin 계정    | 완전 분리 (auth_db)            | 플랫폼 관리자는 별도 보안 요구사항 |
| Operator 계정 | User 기반 역할 부여            | 동일인이 User + Operator 가능      |
| User 계정     | identity_db 통합               | 단일 계정, 단일 인증               |
| BFF 패턴      | 도입 (auth-bff)                | IETF 권장, 토큰 서버 보관          |
| MFA           | Admin 필수, User/Operator 선택 | 보안 수준 차등                     |

### 1.3 Scope

```
IN SCOPE:
  - User/Operator/Admin 인증 시스템
  - 세션 관리 (BFF)
  - MFA (TOTP, Backup Codes)
  - RBAC 권한 관리
  - 감사 로깅

OUT OF SCOPE:
  - SSO (SAML/OIDC Provider) - Phase 2
  - WebAuthn/Passkey - Phase 2
  - Biometric - Phase 2
```

---

## 2. Account Structure

### 2.1 Account Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Account Type Hierarchy                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Admin (Platform)                             │    │
│  │                                                                      │    │
│  │  • 별도 DB (auth_db.admins)                                         │    │
│  │  • 별도 인증 체계                                                   │    │
│  │  • MFA 필수                                                         │    │
│  │  • 플랫폼 전체 관리                                                 │    │
│  │  • User를 Operator로 지정                                           │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    │ assigns                                 │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    User / Operator (Service)                         │    │
│  │                                                                      │    │
│  │  • 통합 DB (identity_db.accounts)                                   │    │
│  │  • 동일 인증 체계                                                   │    │
│  │  • MFA 선택                                                         │    │
│  │                                                                      │    │
│  │  ┌─────────────────────┐     ┌─────────────────────┐                │    │
│  │  │       User          │     │     Operator        │                │    │
│  │  │                     │     │                     │                │    │
│  │  │  • 일반 사용자      │────►│  • User + 역할      │                │    │
│  │  │  • 서비스 이용      │     │  • 서비스 운영      │                │    │
│  │  │                     │     │  • Admin이 지정     │                │    │
│  │  └─────────────────────┘     └─────────────────────┘                │    │
│  │                                                                      │    │
│  │  동일 계정, 동일 비밀번호, 동일 MFA                                 │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Account Type Comparison

| 속성               | User                 | Operator                        | Admin                  |
| ------------------ | -------------------- | ------------------------------- | ---------------------- |
| **DB**             | identity_db.accounts | identity_db.accounts            | auth_db.admins         |
| **세션**           | identity_db.sessions | identity_db.sessions            | auth_db.admin_sessions |
| **비밀번호**       | 자체                 | User와 동일                     | 별도                   |
| **MFA**            | 선택                 | 선택                            | 필수                   |
| **인증 서비스**    | identity-service     | identity-service + auth-service | auth-service           |
| **BFF 엔드포인트** | /user/\*             | /operator/\*                    | /admin/\*              |
| **쿠키**           | session_id           | session_id                      | admin_session_id       |
| **세션 만료**      | 7일 / 30분 idle      | 7일 / 30분 idle                 | 8시간 / 15분 idle      |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                                                                              │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│   │my-girok │  │  vero   │  │ future  │  │web-admin│  │ mobile  │          │
│   │  web    │  │  web    │  │  apps   │  │         │  │         │          │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│        │            │            │            │            │                 │
└────────┼────────────┼────────────┼────────────┼────────────┼─────────────────┘
         │            │            │            │            │
         │ httpOnly Cookie (session_id / admin_session_id)   │
         │            │            │            │            │
         ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EDGE LAYER                                      │
│                                                                              │
│                        Cilium Gateway API                                    │
│   • TLS 1.3 Termination  • DDoS Protection  • WAF  • Rate Limiting          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BFF LAYER                                       │
│                                                                              │
│                           auth-bff (:3010)                                   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Session Store (Valkey)                            │   │
│   │                                                                      │   │
│   │   bff:session:{id} → {                                              │   │
│   │     accountType: "USER" | "OPERATOR" | "ADMIN",                     │   │
│   │     accountId, appSlug, accessToken (encrypted),                    │   │
│   │     refreshToken (encrypted), deviceFingerprint,                    │   │
│   │     mfaVerified, createdAt, expiresAt                               │   │
│   │   }                                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ /user/*     │  │ /operator/* │  │ /admin/*    │  │ /oauth/*    │       │
│   │             │  │             │  │             │  │             │       │
│   │ login       │  │ login       │  │ login       │  │ google      │       │
│   │ register    │  │ logout      │  │ login-mfa   │  │ apple       │       │
│   │ logout      │  │ me          │  │ logout      │  │ kakao       │       │
│   │ refresh     │  │ refresh     │  │ refresh     │  │ naver       │       │
│   │ mfa/*       │  │             │  │ sessions    │  │ callback    │       │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│          │                │                │                │               │
└──────────┼────────────────┼────────────────┼────────────────┼───────────────┘
           │                │                │                │
           │ gRPC (mTLS)    │ gRPC (mTLS)    │ gRPC (mTLS)    │ gRPC (mTLS)
           │                │                │                │
           ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │identity-service │  │  auth-service   │  │  legal-service  │            │
│   │   (:3005)       │  │    (:3001)      │  │    (:3003)      │            │
│   │                 │  │                 │  │                 │            │
│   │ • User 계정     │  │ • Admin 계정    │  │ • 법률 동의     │            │
│   │ • User 세션     │  │ • Admin 세션    │  │ • DSR 처리      │            │
│   │ • 디바이스      │  │ • RBAC          │  │ • 법률 레지스트리│           │
│   │ • 프로필        │  │ • Operator 할당 │  │                 │            │
│   │ • MFA           │  │ • 제재          │  │                 │            │
│   │                 │  │                 │  │                 │            │
│   │  identity_db    │  │   auth_db       │  │   legal_db      │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐                                  │
│   │  audit-service  │  │analytics-service│                                  │
│   │    (:3004)      │  │    (:3006)      │                                  │
│   │                 │  │                 │                                  │
│   │ • 감사 로그     │  │ • 행동 분석     │                                  │
│   │ • 보안 이벤트   │  │ • 퍼널 분석     │                                  │
│   │                 │  │                 │                                  │
│   │   ClickHouse    │  │   ClickHouse    │                                  │
│   └─────────────────┘  └─────────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EVENT LAYER                                       │
│                                                                              │
│                           Redpanda (Kafka API)                               │
│                                                                              │
│   Topics:                                                                    │
│   • identity.account.* (created, updated, deleted)                          │
│   • identity.session.* (created, revoked)                                   │
│   • auth.admin.* (login, logout)                                            │
│   • auth.operator.* (assigned, revoked)                                     │
│   • auth.sanction.* (applied, revoked)                                      │
│   • legal.consent.* (granted, withdrawn)                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE ARCHITECTURE                              │
│                                                                              │
│  ┌─────────────────────────────────────┐                                    │
│  │          identity_db                 │                                    │
│  │       (identity-service)             │                                    │
│  │                                      │                                    │
│  │  accounts ◄────────────────────────────────────────────┐                 │
│  │  ├── id (PK, UUIDv7)                 │                 │                 │
│  │  ├── email (unique)                  │                 │                 │
│  │  ├── password (Argon2id)             │                 │                 │
│  │  ├── username                        │                 │                 │
│  │  ├── status                          │                 │                 │
│  │  ├── mode (SERVICE|UNIFIED)          │                 │                 │
│  │  ├── mfa_enabled                     │                 │                 │
│  │  ├── failed_login_attempts           │                 │                 │
│  │  └── locked_until                    │                 │                 │
│  │           │                          │                 │                 │
│  │           │ 1:N                      │                 │                 │
│  │           ▼                          │                 │                 │
│  │  sessions                            │                 │                 │
│  │  ├── id (PK)                         │                 │ account_id      │
│  │  ├── account_id (FK)                 │                 │ (외부 참조)     │
│  │  ├── session_context (USER|OPERATOR) │                 │                 │
│  │  ├── service_id (Operator용)         │                 │                 │
│  │  ├── token_hash                      │                 │                 │
│  │  ├── refresh_token_hash              │                 │                 │
│  │  └── device_id (FK)                  │                 │                 │
│  │                                      │                 │                 │
│  │  devices, profiles, mfa_backup_codes │                 │                 │
│  │  password_history, revoked_tokens    │                 │                 │
│  │                                      │                 │                 │
│  └─────────────────────────────────────┘                 │                 │
│                                                           │                 │
│  ┌─────────────────────────────────────┐                 │                 │
│  │            auth_db                   │                 │                 │
│  │         (auth-service)               │                 │                 │
│  │                                      │                 │                 │
│  │  admins                              │                 │                 │
│  │  ├── id (PK, UUIDv7)                 │                 │                 │
│  │  ├── email (unique)                  │                 │                 │
│  │  ├── password (Argon2id)             │                 │                 │
│  │  ├── name                            │                 │                 │
│  │  ├── scope (SYSTEM|TENANT)           │                 │                 │
│  │  ├── role_id (FK)                    │                 │                 │
│  │  └── mfa_config_id (FK)              │                 │                 │
│  │           │                          │                 │                 │
│  │           │ 1:N                      │                 │                 │
│  │           ▼                          │                 │                 │
│  │  admin_sessions                      │                 │                 │
│  │  ├── id (PK)                         │                 │                 │
│  │  ├── admin_id (FK)                   │                 │                 │
│  │  ├── mfa_verified                    │                 │                 │
│  │  ├── token_hash                      │                 │                 │
│  │  └── ...                             │                 │                 │
│  │                                      │                 │                 │
│  │  operator_assignments ───────────────┼─────────────────┘                 │
│  │  ├── id (PK)                         │                                   │
│  │  ├── account_id ─────────────────────┘ (identity_db.accounts)            │
│  │  ├── admin_id (FK → admins)          │                                   │
│  │  ├── service_id (FK → services)      │                                   │
│  │  ├── country_code                    │                                   │
│  │  └── status                          │                                   │
│  │           │                          │                                   │
│  │           │ 1:N                      │                                   │
│  │           ▼                          │                                   │
│  │  operator_permissions                │                                   │
│  │  ├── assignment_id (FK)              │                                   │
│  │  ├── permission_id (FK)              │                                   │
│  │  └── granted_by                      │                                   │
│  │                                      │                                   │
│  │  roles, permissions, role_permissions│                                   │
│  │  services, sanctions, tenants        │                                   │
│  │  admin_mfa_configs                   │                                   │
│  │  admin_password_history              │                                   │
│  │  admin_login_attempts                │                                   │
│  │                                      │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                              │
│  ┌─────────────────────────────────────┐                                    │
│  │           legal_db                   │                                    │
│  │        (legal-service)               │                                    │
│  │                                      │                                    │
│  │  consents, legal_documents           │                                    │
│  │  dsr_requests, law_registry          │                                    │
│  │  consent_history                     │                                    │
│  │                                      │                                    │
│  └─────────────────────────────────────┘                                   │
│                                                                              │
│  ┌─────────────────────────────────────┐                                    │
│  │         ClickHouse                   │                                    │
│  │     (audit/analytics)                │                                    │
│  │                                      │                                    │
│  │  auth_events                         │                                    │
│  │  ├── event_type                      │                                    │
│  │  ├── account_type                    │                                    │
│  │  ├── account_id                      │                                    │
│  │  ├── session_id                      │                                    │
│  │  ├── ip_address                      │                                    │
│  │  ├── result                          │                                    │
│  │  └── timestamp                       │                                    │
│  │                                      │                                    │
│  │  security_events                     │                                    │
│  │  admin_audit_logs                    │                                    │
│  │                                      │                                    │
│  └─────────────────────────────────────┘                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Authentication Flows

### 4.1 User Login Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ Auth-BFF │     │ Identity │     │   Auth   │     │  Legal   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ POST /user/login               │                │                │
     │ {email, password, appSlug}     │                │                │
     ├───────────────►│                │                │                │
     │                │                │                │                │
     │                │ gRPC: GetAccountByEmail        │                │
     │                ├───────────────►│                │                │
     │                │◄───────────────┤ Account       │                │
     │                │                │                │                │
     │                │ gRPC: ValidatePassword         │                │
     │                ├───────────────►│                │                │
     │                │◄───────────────┤ Valid         │                │
     │                │                │                │                │
     │                │ gRPC: CheckSanction            │                │
     │                ├────────────────────────────────►│                │
     │                │◄────────────────────────────────┤ No Sanction   │
     │                │                │                │                │
     │                │ gRPC: CheckRequiredConsents    │                │
     │                ├────────────────────────────────────────────────►│
     │                │◄────────────────────────────────────────────────┤
     │                │                │                │                │
     │                │ gRPC: CreateSession            │                │
     │                ├───────────────►│                │                │
     │                │◄───────────────┤ {accessToken, refreshToken}    │
     │                │                │                │                │
     │                │ Store in Valkey               │                │
     │                │ bff:session:{id} → {...}      │                │
     │                │                │                │                │
     │◄───────────────┤                │                │                │
     │ Set-Cookie: session_id         │                │                │
     │ Body: {user, permissions}      │                │                │
     │                │                │                │                │
```

### 4.2 Admin Login Flow (MFA Required)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ Auth-BFF │     │   Auth   │     │  Audit   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /admin/login              │                │
     │ {email, password}              │                │
     ├───────────────►│                │                │
     │                │                │                │
     │                │ gRPC: AdminLogin               │
     │                ├───────────────►│                │
     │                │                │ Validate       │
     │                │                │ Password       │
     │                │◄───────────────┤                │
     │                │ {mfaRequired: true, challengeId}│
     │                │                │                │
     │◄───────────────┤                │                │
     │ Body: {mfaRequired: true, challengeId, methods}  │
     │                │                │                │
     │ POST /admin/login-mfa          │                │
     │ {challengeId, code}            │                │
     ├───────────────►│                │                │
     │                │                │                │
     │                │ gRPC: AdminLoginMfa            │
     │                ├───────────────►│                │
     │                │                │ Verify TOTP    │
     │                │                │ Create Session │
     │                │◄───────────────┤                │
     │                │ {sessionId, accessToken}       │
     │                │                │                │
     │                │ gRPC: LogAdminLogin            │
     │                ├────────────────────────────────►│
     │                │                │                │
     │                │ Store in Valkey               │
     │                │                │                │
     │◄───────────────┤                │                │
     │ Set-Cookie: admin_session_id (path=/admin)      │
     │ Body: {admin, permissions}     │                │
     │                │                │                │
```

### 4.3 Operator Login Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ Auth-BFF │     │ Identity │     │   Auth   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /operator/login           │                │
     │ {email, password, serviceSlug} │                │
     ├───────────────►│                │                │
     │                │                │                │
     │                │ gRPC: GetAccountByEmail        │
     │                ├───────────────►│                │
     │                │◄───────────────┤ Account       │
     │                │                │                │
     │                │ gRPC: ValidatePassword         │
     │                ├───────────────►│                │
     │                │◄───────────────┤ Valid         │
     │                │                │                │
     │                │ gRPC: GetOperatorAssignment    │
     │                ├────────────────────────────────►│
     │                │◄────────────────────────────────┤
     │                │ {assignment, permissions}      │
     │                │                │                │
     │                │ (If no assignment → 403)       │
     │                │                │                │
     │                │ gRPC: CreateSession            │
     │                │ (context: OPERATOR, serviceId) │
     │                ├───────────────►│                │
     │                │◄───────────────┤ {tokens}      │
     │                │                │                │
     │◄───────────────┤                │                │
     │ Set-Cookie: session_id         │                │
     │ Body: {user, operatorContext}  │                │
     │                │                │                │
```

### 4.4 Session Validation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ Auth-BFF │     │ Identity │     │   Auth   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ GET /api/resource              │                │
     │ Cookie: session_id             │                │
     ├───────────────►│                │                │
     │                │                │                │
     │                │ Get from Valkey               │
     │                │ bff:session:{id}              │
     │                │                │                │
     │                │ Check expiry, device          │
     │                │                │                │
     │                │ (If expired or invalid)       │
     │◄───────────────┤ 401 Unauthorized              │
     │                │                │                │
     │                │ (If valid + tokens expired)   │
     │                │ gRPC: RefreshSession          │
     │                ├───────────────►│                │
     │                │◄───────────────┤ New tokens    │
     │                │                │                │
     │                │ (If valid)                     │
     │                │ Forward to service with JWT   │
     │                ├───────────────────────────────►│
     │◄───────────────┤                │                │
     │ Response       │                │                │
     │                │                │                │
```

---

## 5. Security Specifications

### 5.1 Password Policy (OWASP 2024)

| 항목           | 설정               | 근거                     |
| -------------- | ------------------ | ------------------------ |
| Hash Algorithm | Argon2id           | OWASP 2024 권장          |
| Memory         | 64MB               | 표준 권장값              |
| Iterations     | 3                  | 표준 권장값              |
| Parallelism    | 4                  | 표준 권장값              |
| Min Length     | 12                 | NIST 권장                |
| Max Length     | 128                | 실용적 상한              |
| Complexity     | 불필요             | NIST: 복잡성 규칙 불필요 |
| History        | 12                 | 최근 12개 재사용 금지    |
| Breach Check   | HaveIBeenPwned API | 유출 비밀번호 차단       |

### 5.2 Session Policy

| 항목             | User | Operator | Admin |
| ---------------- | ---- | -------- | ----- |
| Absolute Timeout | 7일  | 7일      | 8시간 |
| Idle Timeout     | 30분 | 30분     | 15분  |
| Max Concurrent   | 10   | 5        | 3     |
| Device Binding   | Yes  | Yes      | Yes   |
| MFA Required     | No   | No       | Yes   |

### 5.3 Token Policy

| 항목                   | 설정                      | 근거                 |
| ---------------------- | ------------------------- | -------------------- |
| Access Token Lifetime  | 15분                      | 짧은 노출 시간       |
| Refresh Token Lifetime | User: 14일, Admin: 24시간 | 역할별 차등          |
| Algorithm              | RS256                     | 비대칭 키, 검증 용이 |
| Rotation               | Refresh Token Rotation    | 재사용 탐지          |
| Binding                | DPoP (Admin)              | 토큰 바인딩          |
| Storage                | 서버 (BFF Valkey)         | 클라이언트 노출 없음 |

### 5.4 Rate Limiting

| 엔드포인트   | Per IP | Per Account | Global  |
| ------------ | ------ | ----------- | ------- |
| /user/login  | 5/분   | 10/시간     | 1000/분 |
| /admin/login | 3/분   | 5/시간      | 100/분  |
| /\*/mfa      | 5/분   | -           | 500/분  |
| /\*/refresh  | 10/분  | -           | 5000/분 |

### 5.5 Account Lockout

| 항목             | User | Admin |
| ---------------- | ---- | ----- |
| Max Failures     | 5    | 3     |
| Lockout Duration | 15분 | 30분  |
| Reset Window     | 30분 | 1시간 |
| Notification     | No   | Email |

---

## 6. Service Responsibilities

### 6.1 identity-service

```yaml
Port: 3005
gRPC: 50051
Database: identity_db

Responsibilities:
  - User/Operator 계정 관리
  - User/Operator 세션 관리
  - 디바이스 관리
  - 프로필 관리
  - MFA 관리 (User)
  - 비밀번호 관리 (User)

gRPC Methods:
  Account:
    - CreateAccount
    - GetAccount
    - GetAccountByEmail
    - ValidateAccount
    - UpdateAccount
    - DeleteAccount

  Auth:
    - ValidatePassword
    - ChangePassword
    - ResetPassword
    - RecordLoginAttempt
    - LockAccount
    - UnlockAccount

  Session:
    - CreateSession
    - ValidateSession
    - RefreshSession
    - RevokeSession
    - RevokeAllSessions

  MFA:
    - SetupMfa
    - VerifyMfa
    - DisableMfa
    - GetBackupCodes
    - UseBackupCode

  Device:
    - GetDevices
    - TrustDevice
    - RevokeDevice

  Profile:
    - GetProfile
    - UpdateProfile
```

### 6.2 auth-service

```yaml
Port: 3001
gRPC: 50052
Database: auth_db

Responsibilities:
  - Admin 계정 관리
  - Admin 세션 관리
  - Admin MFA 관리
  - Operator 할당 관리
  - RBAC (역할/권한)
  - 제재 관리
  - 서비스 관리

gRPC Methods:
  Admin Auth:
    - AdminLogin
    - AdminLoginMfa
    - AdminValidateSession
    - AdminRefreshSession
    - AdminLogout
    - AdminRevokeAllSessions
    - AdminGetActiveSessions

  Admin MFA:
    - AdminSetupMfa
    - AdminVerifyMfa
    - AdminDisableMfa
    - AdminRegenerateBackupCodes

  Admin Password:
    - AdminChangePassword
    - AdminForcePasswordChange

  Operator:
    - AssignOperator
    - RevokeOperator
    - GetOperatorAssignment
    - GetOperatorPermissions
    - UpdateOperatorPermissions

  RBAC:
    - CheckPermission
    - CheckPermissions
    - GetRole
    - GetRoles

  Sanction:
    - CheckSanction
    - GetActiveSanctions
    - ApplySanction
    - RevokeSanction

  Service:
    - GetService
    - GetServices
```

### 6.3 auth-bff

```yaml
Port: 3010
Protocol: REST only (gRPC client)
Database: None (Stateless)
Session Store: Valkey

Responsibilities:
  - 세션 관리 (Valkey)
  - 토큰 교환 (Token Exchange)
  - 쿠키 발급/검증
  - Rate Limiting
  - CSRF Protection
  - gRPC → REST 변환

REST Endpoints:
  User:
    - POST /user/register
    - POST /user/login
    - POST /user/logout
    - POST /user/refresh
    - POST /user/mfa/setup
    - POST /user/mfa/verify
    - GET  /user/me

  Operator:
    - POST /operator/login
    - POST /operator/logout
    - POST /operator/refresh
    - GET  /operator/me

  Admin:
    - POST /admin/login
    - POST /admin/login-mfa
    - POST /admin/logout
    - POST /admin/refresh
    - GET  /admin/sessions
    - POST /admin/sessions/:id/revoke
    - GET  /admin/me

  OAuth:
    - GET  /oauth/:provider
    - GET  /oauth/:provider/callback

  Session:
    - GET  /session/validate
    - POST /session/revoke
```

### 6.4 audit-service

```yaml
Port: 3004
gRPC: 50054
Database: ClickHouse

Responsibilities:
  - 인증 이벤트 로깅
  - 보안 이벤트 로깅
  - Admin 감사 로그
  - 컴플라이언스 리포트

gRPC Methods:
  - LogAuthEvent
  - LogSecurityEvent
  - LogAdminAction
  - GetAuthEvents
  - GetSecurityEvents
  - GetAdminAuditLog
  - GenerateComplianceReport
```

---

## 7. Implementation Roadmap

### Phase 1: Database Migration (1-2 weeks)

```yaml
Tasks:
  1.1 auth_db migrations:
    - admin_sessions 테이블 생성
    - admin_mfa_configs 테이블 생성
    - admin_password_history 테이블 생성
    - admin_login_attempts 테이블 생성
    - operator_assignments 테이블 생성 (operators 대체)
    - operator_permissions 테이블 수정

  1.2 identity_db migrations:
    - sessions.session_context 컬럼 추가
    - sessions.service_id 컬럼 추가

  1.3 Prisma schema update:
    - auth-service/prisma/schema.prisma
    - identity-service/prisma/identity/schema.prisma

Deliverables:
  - Migration files
  - Updated Prisma schemas
  - Seed data for testing
```

### Phase 2: Proto & gRPC Implementation (2-3 weeks)

```yaml
Tasks:
  2.1 Proto definitions:
    - packages/proto/auth/v1/auth.proto (Admin auth 추가)
    - packages/proto/identity/v1/identity.proto (MFA, Password 추가)

  2.2 Proto generation:
    - pnpm proto:generate

  2.3 auth-service gRPC:
    - AdminAuth gRPC controller
    - AdminAuth service
    - AdminMfa service
    - OperatorAssignment service

  2.4 identity-service gRPC:
    - MFA gRPC methods
    - Password gRPC methods
    - Session context support

Deliverables:
  - Updated proto files
  - Generated TypeScript types
  - gRPC controllers and services
  - Unit tests
```

### Phase 3: Auth-BFF Service (2-3 weeks)

```yaml
Tasks:
  3.1 Service scaffolding:
    - NestJS project setup
    - Module structure
    - Configuration

  3.2 Session management:
    - Valkey integration
    - Session store service
    - Token encryption

  3.3 REST endpoints:
    - User auth endpoints
    - Admin auth endpoints
    - Operator auth endpoints
    - OAuth endpoints

  3.4 Security:
    - Rate limiting
    - CSRF protection
    - Cookie configuration
    - Device fingerprinting

  3.5 gRPC clients:
    - Identity service client
    - Auth service client
    - Legal service client

Deliverables:
  - services/auth-bff
  - Docker configuration
  - Kubernetes manifests
  - Integration tests
```

### Phase 4: Frontend Integration (1-2 weeks)

```yaml
Tasks:
  4.1 web-admin:
    - API client update (auth-bff)
    - Login page update
    - MFA setup UI
    - Session management UI

  4.2 web-main:
    - API client update (auth-bff)
    - Login/register flow
    - MFA setup flow

Deliverables:
  - Updated frontend apps
  - E2E tests
```

### Phase 5: Testing & Documentation (1 week)

```yaml
Tasks:
  5.1 Testing:
    - Unit tests (80%+ coverage)
    - Integration tests
    - E2E tests
    - Security tests (OWASP ZAP)

  5.2 Documentation:
    - API documentation
    - Architecture documentation
    - Runbook

Deliverables:
  - Test reports
  - Documentation
```

---

## 8. Risk Assessment

| Risk                    | Impact | Probability | Mitigation                     |
| ----------------------- | ------ | ----------- | ------------------------------ |
| Data migration failure  | High   | Low         | 단계적 마이그레이션, 롤백 계획 |
| Session store failure   | High   | Low         | Valkey 클러스터, 폴백 전략     |
| Breaking changes        | Medium | Medium      | API 버저닝, 점진적 전환        |
| Performance degradation | Medium | Low         | 로드 테스트, 캐싱 전략         |
| Security vulnerability  | High   | Low         | 보안 감사, 침투 테스트         |

---

## 9. Success Criteria

| Criteria            | Target        | Measurement          |
| ------------------- | ------------- | -------------------- |
| Login latency       | < 500ms (p99) | Prometheus metrics   |
| Session validation  | < 50ms (p99)  | Prometheus metrics   |
| Availability        | 99.9%         | Uptime monitoring    |
| Test coverage       | > 80%         | Jest coverage report |
| Security compliance | OWASP ASVS L2 | Security audit       |

---

## Appendix

### A. Related Documents

- `.ai/architecture.md` - System architecture
- `.ai/services/identity-service.md` - Identity service
- `.ai/services/auth-service.md` - Auth service
- `docs/llm/policies/identity-platform.md` - Identity platform policy
- `docs/llm/policies/security.md` - Security policy

### B. Standards Reference

- RFC 9700 - OAuth 2.1
- RFC 9449 - DPoP
- RFC 9068 - JWT Best Practices
- RFC 6238 - TOTP
- NIST 800-63B - Digital Identity Guidelines
- OWASP ASVS 4.0 - Application Security Verification

### C. Glossary

| Term | Definition                        |
| ---- | --------------------------------- |
| BFF  | Backend for Frontend              |
| DPoP | Demonstrating Proof of Possession |
| MFA  | Multi-Factor Authentication       |
| RBAC | Role-Based Access Control         |
| RTR  | Refresh Token Rotation            |
| TOTP | Time-based One-Time Password      |
