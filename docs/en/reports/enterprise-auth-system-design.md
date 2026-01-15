# Enterprise Authentication System Design Report

> Comprehensive design specification for the multi-application authentication platform
> Version: 1.0 | Date: 2026-01-08 | Status: Draft

## Executive Summary

### Purpose

This document defines the enterprise-grade authentication system architecture designed to serve multiple applications (my-girok, vero, and future apps) with a unified authentication infrastructure. The primary goal is to eliminate authentication reimplementation during PoC development, enabling rapid onboarding for new services.

### Key Architectural Decisions

The following decisions shape the authentication system design:

| Decision          | Choice                                    | Rationale                                                      |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------- |
| Admin Accounts    | Completely separate (auth_db)             | Platform administrators require distinct security requirements |
| Operator Accounts | Role assignment to Users                  | Same person can be both User and Operator                      |
| User Accounts     | Unified (identity_db)                     | Single account, single authentication flow                     |
| BFF Pattern       | Adopted (auth-bff)                        | IETF recommended, tokens stored server-side                    |
| MFA Requirements  | Admin: mandatory, User/Operator: optional | Tiered security based on access level                          |

### Scope

**In Scope:**

- User, Operator, and Admin authentication systems
- Session management via BFF
- Multi-Factor Authentication (TOTP and backup codes)
- Role-Based Access Control (RBAC)
- Audit logging

**Out of Scope (Phase 2):**

- Single Sign-On (SAML/OIDC Provider)
- WebAuthn/Passkey
- Biometric authentication

---

## Account Structure

### Account Type Hierarchy

The authentication system distinguishes between three account types with different trust levels and management approaches.

**Admin (Platform Level)**
Admin accounts are completely separate from the user database, stored in `auth_db.admins`. These accounts manage the entire platform and have the authority to assign Operator roles to Users. MFA is mandatory for all Admin accounts, and sessions have shorter timeouts for security.

**User (Service Level)**
User accounts are stored in `identity_db.accounts` and represent end-users of the platform services. They use standard authentication with optional MFA. Users can access any service they have been granted access to.

**Operator (Service Level)**
Operators are not separate accounts but rather Users who have been granted special privileges by an Admin. An Operator uses the same credentials as their User account but gains additional permissions for service management. This design allows the same person to switch between User and Operator contexts seamlessly.

### Account Type Comparison

| Attribute       | User                 | Operator                        | Admin                  |
| --------------- | -------------------- | ------------------------------- | ---------------------- |
| Database        | identity_db.accounts | identity_db.accounts            | auth_db.admins         |
| Session Storage | identity_db.sessions | identity_db.sessions            | auth_db.admin_sessions |
| Password        | Self-managed         | Same as User                    | Separate               |
| MFA             | Optional             | Optional                        | Mandatory              |
| Auth Service    | identity-service     | identity-service + auth-service | auth-service           |
| BFF Endpoint    | /user/\*             | /operator/\*                    | /admin/\*              |
| Cookie Name     | session_id           | session_id                      | admin_session_id       |
| Session Timeout | 7 days / 30 min idle | 7 days / 30 min idle            | 8 hours / 15 min idle  |

---

## System Architecture

### High-Level Overview

The authentication system uses a layered architecture with clear separation of concerns:

**Client Layer**
Multiple clients (my-girok web, vero web, future apps, web-admin, mobile) connect to the system using httpOnly cookies containing session identifiers. No tokens are exposed to the client.

**Edge Layer**
Cilium Gateway API handles TLS 1.3 termination, DDoS protection, WAF, and rate limiting at the network edge.

**BFF Layer**
The auth-bff service (port 3010) manages sessions in Valkey with encrypted token storage. It provides REST endpoints for User, Operator, Admin, and OAuth authentication flows. The session store maintains account type, encrypted access/refresh tokens, device fingerprint, MFA verification status, and expiration times.

**Service Layer**
Backend services communicate via gRPC with mutual TLS:

- **identity-service (port 3005)**: Manages User accounts, sessions, devices, profiles, and MFA
- **auth-service (port 3001)**: Manages Admin accounts, sessions, RBAC, Operator assignments, and sanctions
- **legal-service (port 3003)**: Handles consent management and DSR processing
- **audit-service (port 3004)**: Records authentication and security events to ClickHouse
- **analytics-service (port 3006)**: Provides behavioral and funnel analytics

**Event Layer**
Redpanda (Kafka-compatible) handles event streaming for:

- Identity events: account.created, account.updated, account.deleted, session.created, session.revoked
- Auth events: admin.login, admin.logout, operator.assigned, operator.revoked, sanction.applied, sanction.revoked
- Legal events: consent.granted, consent.withdrawn

### Database Architecture

The system uses separate databases for isolation:

**identity_db (identity-service)**
Primary tables:

- `accounts` - User accounts with UUIDv7 primary keys, email, Argon2id password hash, username, status, mode (SERVICE/UNIFIED), MFA settings, and lockout tracking
- `sessions` - Active sessions linked to accounts, with session context (USER/OPERATOR), service ID for operators, token hashes, and device binding
- Supporting tables: `devices`, `profiles`, `mfa_backup_codes`, `password_history`, `revoked_tokens`

**auth_db (auth-service)**
Primary tables:

- `admins` - Admin accounts with UUIDv7 keys, email, password hash, name, scope (SYSTEM/TENANT), role reference, and MFA config reference
- `admin_sessions` - Admin sessions with MFA verification status
- `operator_assignments` - Links User accounts to Operator roles with service assignment
- `operator_permissions` - Granular permissions for each operator assignment
- Supporting tables: `roles`, `permissions`, `role_permissions`, `services`, `sanctions`, `tenants`, `admin_mfa_configs`, `admin_password_history`, `admin_login_attempts`

**legal_db (legal-service)**
Tables: `consents`, `legal_documents`, `dsr_requests`, `law_registry`, `consent_history`

**ClickHouse (audit/analytics)**
Tables: `auth_events`, `security_events`, `admin_audit_logs`

---

## Authentication Flows

### User Login Flow

1. Client sends POST /user/login with email, password, and appSlug
2. Auth-BFF calls identity-service GetAccountByEmail
3. Auth-BFF calls identity-service ValidatePassword
4. Auth-BFF calls auth-service CheckSanction to verify no active restrictions
5. Auth-BFF calls legal-service CheckRequiredConsents
6. Auth-BFF calls identity-service CreateSession to generate tokens
7. Auth-BFF stores session in Valkey with encrypted tokens
8. Auth-BFF returns Set-Cookie header with session_id and user/permissions in body

### Admin Login Flow (MFA Required)

Admin authentication is a two-step process:

**Step 1: Password Verification**

1. Client sends POST /admin/login with email and password
2. Auth-BFF calls auth-service AdminLogin
3. Auth-service validates password and returns MFA challenge
4. Auth-BFF returns mfaRequired: true with challengeId and available methods

**Step 2: MFA Verification**

1. Client sends POST /admin/login-mfa with challengeId and code
2. Auth-BFF calls auth-service AdminLoginMfa
3. Auth-service verifies TOTP/backup code and creates session
4. Auth-BFF calls audit-service LogAdminLogin
5. Auth-BFF stores session in Valkey
6. Auth-BFF returns Set-Cookie header (path=/admin) with admin/permissions

### Operator Login Flow

1. Client sends POST /operator/login with email, password, and serviceSlug
2. Auth-BFF calls identity-service GetAccountByEmail
3. Auth-BFF calls identity-service ValidatePassword
4. Auth-BFF calls auth-service GetOperatorAssignment to verify role
5. If no assignment exists, return 403 Forbidden
6. Auth-BFF calls identity-service CreateSession with OPERATOR context and serviceId
7. Auth-BFF returns Set-Cookie with session_id and operatorContext

### Session Validation Flow

1. Client sends request with session_id cookie
2. Auth-BFF retrieves session from Valkey
3. Auth-BFF checks expiry and device fingerprint
4. If expired or invalid: return 401 Unauthorized
5. If valid but tokens expired: call identity-service RefreshSession for new tokens
6. If valid: forward request to backend service with JWT authorization header

---

## Security Specifications

### Password Policy (OWASP 2024)

The system follows OWASP 2024 and NIST guidelines for password security:

| Setting          | Value              | Rationale                                    |
| ---------------- | ------------------ | -------------------------------------------- |
| Hash Algorithm   | Argon2id           | OWASP 2024 recommended                       |
| Memory           | 64MB               | Standard recommended value                   |
| Iterations       | 3                  | Standard recommended value                   |
| Parallelism      | 4                  | Standard recommended value                   |
| Minimum Length   | 12 characters      | NIST recommendation                          |
| Maximum Length   | 128 characters     | Practical upper limit                        |
| Complexity Rules | Not required       | NIST: complexity rules are counterproductive |
| Password History | 12                 | Prevent reuse of last 12 passwords           |
| Breach Check     | HaveIBeenPwned API | Block known compromised passwords            |

### Session Policy

Session timeouts vary by account type to balance security and usability:

| Setting                 | User       | Operator   | Admin      |
| ----------------------- | ---------- | ---------- | ---------- |
| Absolute Timeout        | 7 days     | 7 days     | 8 hours    |
| Idle Timeout            | 30 minutes | 30 minutes | 15 minutes |
| Max Concurrent Sessions | 10         | 5          | 3          |
| Device Binding          | Yes        | Yes        | Yes        |
| MFA Required            | No         | No         | Yes        |

### Token Policy

| Setting                | Value                          | Rationale                          |
| ---------------------- | ------------------------------ | ---------------------------------- |
| Access Token Lifetime  | 15 minutes                     | Minimize exposure window           |
| Refresh Token Lifetime | User: 14 days, Admin: 24 hours | Role-based differentiation         |
| Algorithm              | RS256                          | Asymmetric keys, easy verification |
| Rotation               | Refresh Token Rotation         | Detect token reuse                 |
| Binding                | DPoP (Admin only)              | Token possession proof             |
| Storage                | Server-side (BFF Valkey)       | No client token exposure           |

### Rate Limiting

| Endpoint     | Per IP | Per Account | Global   |
| ------------ | ------ | ----------- | -------- |
| /user/login  | 5/min  | 10/hour     | 1000/min |
| /admin/login | 3/min  | 5/hour      | 100/min  |
| /\*/mfa      | 5/min  | -           | 500/min  |
| /\*/refresh  | 10/min | -           | 5000/min |

### Account Lockout

| Setting             | User       | Admin       |
| ------------------- | ---------- | ----------- |
| Max Failed Attempts | 5          | 3           |
| Lockout Duration    | 15 minutes | 30 minutes  |
| Reset Window        | 30 minutes | 1 hour      |
| Notification        | None       | Email alert |

---

## Service Responsibilities

### identity-service (Port 3005, gRPC 50051)

**Database:** identity_db

**Responsibilities:**

- User and Operator account management
- User and Operator session management
- Device registration and trust management
- Profile management
- MFA management for Users
- Password management for Users

**gRPC Methods:**

Account operations: CreateAccount, GetAccount, GetAccountByEmail, ValidateAccount, UpdateAccount, DeleteAccount

Authentication: ValidatePassword, ChangePassword, ResetPassword, RecordLoginAttempt, LockAccount, UnlockAccount

Session management: CreateSession, ValidateSession, RefreshSession, RevokeSession, RevokeAllSessions

MFA: SetupMfa, VerifyMfa, DisableMfa, GetBackupCodes, UseBackupCode

Device: GetDevices, TrustDevice, RevokeDevice

Profile: GetProfile, UpdateProfile

### auth-service (Port 3001, gRPC 50052)

**Database:** auth_db

**Responsibilities:**

- Admin account management
- Admin session management
- Admin MFA management
- Operator assignment management
- RBAC (roles and permissions)
- Sanction management
- Service registration

**gRPC Methods:**

Admin authentication: AdminLogin, AdminLoginMfa, AdminValidateSession, AdminRefreshSession, AdminLogout, AdminRevokeAllSessions, AdminGetActiveSessions

Admin MFA: AdminSetupMfa, AdminVerifyMfa, AdminDisableMfa, AdminRegenerateBackupCodes

Admin password: AdminChangePassword, AdminForcePasswordChange

Operator: AssignOperator, RevokeOperator, GetOperatorAssignment, GetOperatorPermissions, UpdateOperatorPermissions

RBAC: CheckPermission, CheckPermissions, GetRole, GetRoles

Sanction: CheckSanction, GetActiveSanctions, ApplySanction, RevokeSanction

Service: GetService, GetServices

### auth-bff (Port 3010)

**Protocol:** REST only (acts as gRPC client)
**Database:** None (stateless)
**Session Store:** Valkey

**Responsibilities:**

- Session management via Valkey
- Token exchange (receives tokens from services, stores encrypted)
- Cookie issuance and validation
- Rate limiting enforcement
- CSRF protection
- gRPC to REST transformation

**REST Endpoints:**

User: POST /user/register, POST /user/login, POST /user/logout, POST /user/refresh, POST /user/mfa/setup, POST /user/mfa/verify, GET /user/me

Operator: POST /operator/login, POST /operator/logout, POST /operator/refresh, GET /operator/me

Admin: POST /admin/login, POST /admin/login-mfa, POST /admin/logout, POST /admin/refresh, GET /admin/sessions, POST /admin/sessions/:id/revoke, GET /admin/me

OAuth: GET /oauth/:provider, GET /oauth/:provider/callback

Session: GET /session/validate, POST /session/revoke

### audit-service (Port 3004, gRPC 50054)

**Database:** ClickHouse

**Responsibilities:**

- Authentication event logging
- Security event logging
- Admin audit trail
- Compliance reporting

**gRPC Methods:**
LogAuthEvent, LogSecurityEvent, LogAdminAction, GetAuthEvents, GetSecurityEvents, GetAdminAuditLog, GenerateComplianceReport

---

## Implementation Roadmap

### Phase 1: Database Migration (1-2 weeks)

**auth_db migrations:**

- Create admin_sessions table
- Create admin_mfa_configs table
- Create admin_password_history table
- Create admin_login_attempts table
- Create operator_assignments table (replaces operators)
- Modify operator_permissions table

**identity_db migrations:**

- Add sessions.session_context column
- Add sessions.service_id column

**Deliverables:** Migration files, updated Prisma schemas, seed data for testing

### Phase 2: Proto & gRPC Implementation (2-3 weeks)

**Proto definitions:**

- Update packages/proto/auth/v1/auth.proto with Admin auth
- Update packages/proto/identity/v1/identity.proto with MFA and Password

**Implementation:**

- Run pnpm proto:generate
- Build AdminAuth gRPC controller and service
- Build AdminMfa service
- Build OperatorAssignment service
- Add MFA gRPC methods to identity-service
- Add session context support to identity-service

**Deliverables:** Updated proto files, generated TypeScript types, gRPC controllers/services, unit tests

### Phase 3: Auth-BFF Service (2-3 weeks)

**Service setup:**

- NestJS project scaffolding
- Module structure and configuration

**Session management:**

- Valkey integration
- Session store service with encryption

**REST endpoints:**

- User, Admin, Operator, OAuth endpoints

**Security features:**

- Rate limiting
- CSRF protection
- Cookie configuration
- Device fingerprinting

**gRPC clients:**

- Identity, Auth, Legal service clients

**Deliverables:** services/auth-bff, Docker configuration, Kubernetes manifests, integration tests

### Phase 4: Frontend Integration (1-2 weeks)

**web-admin:**

- Update API client for auth-bff
- Login page improvements
- MFA setup UI
- Session management UI

**web-main:**

- Update API client for auth-bff
- Login and registration flow
- MFA setup flow

**Deliverables:** Updated frontend apps, E2E tests

### Phase 5: Testing & Documentation (1 week)

**Testing:**

- Unit tests with 80%+ coverage
- Integration tests
- E2E tests
- Security tests (OWASP ZAP)

**Documentation:**

- API documentation
- Architecture documentation
- Runbook

**Deliverables:** Test reports, documentation

---

## Risk Assessment

| Risk                    | Impact | Probability | Mitigation                               |
| ----------------------- | ------ | ----------- | ---------------------------------------- |
| Data migration failure  | High   | Low         | Incremental migration with rollback plan |
| Session store failure   | High   | Low         | Valkey cluster with fallback strategy    |
| Breaking changes        | Medium | Medium      | API versioning, gradual transition       |
| Performance degradation | Medium | Low         | Load testing, caching strategy           |
| Security vulnerability  | High   | Low         | Security audit, penetration testing      |

---

## Success Criteria

| Criteria            | Target        | Measurement            |
| ------------------- | ------------- | ---------------------- |
| Login latency       | < 500ms (p99) | Prometheus metrics     |
| Session validation  | < 50ms (p99)  | Prometheus metrics     |
| Availability        | 99.9%         | Uptime monitoring      |
| Test coverage       | > 80%         | Vitest coverage report |
| Security compliance | OWASP ASVS L2 | Security audit         |

---

## Appendix

### Related Documents

- `.ai/architecture.md` - System architecture overview
- `.ai/services/identity-service.md` - Identity service indicator
- `.ai/services/auth-service.md` - Auth service indicator
- `docs/llm/policies/identity-platform.md` - Identity platform policy
- `docs/llm/policies/security.md` - Security policy

### Standards Reference

- RFC 9700 - OAuth 2.1
- RFC 9449 - DPoP (Demonstrating Proof of Possession)
- RFC 9068 - JWT Best Practices
- RFC 6238 - TOTP
- NIST 800-63B - Digital Identity Guidelines
- OWASP ASVS 4.0 - Application Security Verification Standard

### Glossary

| Term | Definition                                                                         |
| ---- | ---------------------------------------------------------------------------------- |
| BFF  | Backend for Frontend - a pattern where a dedicated backend serves frontend clients |
| DPoP | Demonstrating Proof of Possession - a mechanism to bind tokens to the client       |
| MFA  | Multi-Factor Authentication - requiring multiple verification methods              |
| RBAC | Role-Based Access Control - permissions assigned via roles                         |
| RTR  | Refresh Token Rotation - issuing new refresh tokens on each use                    |
| TOTP | Time-based One-Time Password - time-synchronized verification codes                |

---

**LLM Reference:** `docs/llm/reports/enterprise-auth-system-design.md`
