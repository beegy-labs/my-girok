# Enterprise Auth Architecture

> System and database architecture for enterprise authentication

**Version**: 1.0

## High-Level Architecture

```
CLIENT LAYER
├── my-girok web    ─┐
├── vero web        ─┤
├── future apps     ─┼── httpOnly Cookie (session_id / admin_session_id)
├── web-admin       ─┤
└── mobile          ─┘
         │
         ▼
EDGE LAYER (Cilium Gateway API)
├── TLS 1.3 Termination
├── DDoS Protection
├── WAF
└── Rate Limiting
         │
         ▼
BFF LAYER (auth-bff :3010)
├── Session Store (Valkey)
│   └── bff:session:{id} → {
│         accountType, accountId, appSlug,
│         accessToken (encrypted), refreshToken (encrypted),
│         deviceFingerprint, mfaVerified, createdAt, expiresAt
│       }
│
├── /user/*     (login, register, logout, refresh, mfa/*)
├── /operator/* (login, logout, me, refresh)
├── /admin/*    (login, login-mfa, logout, refresh, sessions)
└── /oauth/*    (google, apple, kakao, naver, callback)
         │
         │ gRPC (mTLS)
         ▼
SERVICE LAYER
├── identity-service (:3005) - User accounts, sessions, devices, MFA
├── auth-service (:3001)     - Admin accounts, RBAC, Operator assignment
├── legal-service (:3003)    - Consent, DSR, Law registry
├── audit-service (:3004)    - Audit logs, security events (ClickHouse)
└── analytics-service (:3006) - Behavior analysis (ClickHouse)
         │
         ▼
EVENT LAYER (Redpanda)
├── identity.account.* (created, updated, deleted)
├── identity.session.* (created, revoked)
├── auth.admin.* (login, logout)
├── auth.operator.* (assigned, revoked)
├── auth.sanction.* (applied, revoked)
└── legal.consent.* (granted, withdrawn)
```

## Database Architecture

### identity_db (identity-service)

| Table            | Key Fields                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| accounts         | id (UUIDv7), email, password (Argon2id), status, mode, mfa_enabled            |
| sessions         | id, account_id (FK), session_context (USER\|OPERATOR), service_id, token_hash |
| devices          | Device management                                                             |
| profiles         | User profiles                                                                 |
| mfa_backup_codes | MFA backup codes                                                              |
| password_history | Password history                                                              |
| revoked_tokens   | Revoked tokens                                                                |

### auth_db (auth-service)

| Table                  | Key Fields                                                       |
| ---------------------- | ---------------------------------------------------------------- |
| admins                 | id (UUIDv7), email, password, scope (SYSTEM\|TENANT), role_id    |
| admin_sessions         | id, admin_id (FK), mfa_verified, token_hash                      |
| operator_assignments   | id, account_id (identity_db), admin_id, service_id, country_code |
| operator_permissions   | assignment_id (FK), permission_id (FK)                           |
| roles                  | Role definitions                                                 |
| permissions            | Permission definitions                                           |
| role_permissions       | Role-permission mapping                                          |
| services               | Service registry                                                 |
| sanctions              | Account sanctions                                                |
| admin_mfa_configs      | Admin MFA configuration                                          |
| admin_password_history | Admin password history                                           |
| admin_login_attempts   | Admin login attempts                                             |

### legal_db (legal-service)

| Table           | Purpose                |
| --------------- | ---------------------- |
| consents        | User consent records   |
| legal_documents | Legal document storage |
| dsr_requests    | DSR request tracking   |
| law_registry    | Law registry           |
| consent_history | Consent history        |

### ClickHouse (audit/analytics)

| Table            | Purpose               |
| ---------------- | --------------------- |
| auth_events      | Authentication events |
| security_events  | Security events       |
| admin_audit_logs | Admin audit logs      |

## Cross-DB Reference

```
identity_db.accounts.id
        │
        └──── auth_db.operator_assignments.account_id
              (external reference, no FK constraint)
```

The operator assignment references identity_db accounts by ID but without database-level foreign key constraints to maintain service isolation.

## Related Documents

- Overview: `docs/en/guides/enterprise-auth-overview.md`
- Auth Flows: `docs/en/guides/enterprise-auth-flows.md`
- Security: `docs/en/guides/enterprise-auth-security.md`

---

_This document is auto-generated from `docs/llm/guides/enterprise-auth-architecture.md`_
