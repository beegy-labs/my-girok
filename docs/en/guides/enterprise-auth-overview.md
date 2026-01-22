# Enterprise Auth Overview

> Account types and key decisions for enterprise authentication

**Version**: 1.0 | **Date**: 2026-01-08

## Purpose

Enterprise-grade authentication system shared across all services (my-girok, vero, future apps). This common infrastructure enables rapid onboarding for PoC development without re-implementing authentication.

## Key Decisions

| Decision         | Choice                        | Rationale                                  |
| ---------------- | ----------------------------- | ------------------------------------------ |
| Admin Account    | Separate (auth_db)            | Platform admins have separate security req |
| Operator Account | Role-based on User            | Same person can be User + Operator         |
| User Account     | Unified (identity_db)         | Single account, single auth                |
| BFF Pattern      | Adopted (auth-bff)            | IETF recommended, token server-side        |
| MFA              | Admin required, User optional | Tiered security levels                     |

## Scope

**IN SCOPE:**

- User/Operator/Admin authentication
- Session management (BFF)
- MFA (TOTP, Backup Codes)
- RBAC permission management
- Audit logging

**OUT OF SCOPE (Phase 2):**

- SSO (SAML/OIDC Provider)
- WebAuthn/Passkey
- Biometric authentication

## Account Types

| Property         | User                 | Operator                        | Admin                  |
| ---------------- | -------------------- | ------------------------------- | ---------------------- |
| **Database**     | identity_db.accounts | identity_db.accounts            | auth_db.admins         |
| **Sessions**     | identity_db.sessions | identity_db.sessions            | auth_db.admin_sessions |
| **Password**     | Own                  | Same as User                    | Separate               |
| **MFA**          | Optional             | Optional                        | Required               |
| **Auth Service** | identity-service     | identity-service + auth-service | auth-service           |
| **BFF Endpoint** | /user/\*             | /operator/\*                    | /admin/\*              |
| **Cookie**       | session_id           | session_id                      | admin_session_id       |
| **Session TTL**  | 7d / 30m idle        | 7d / 30m idle                   | 8h / 15m idle          |

## Account Hierarchy

```
Admin (Platform)
├── Separate DB (auth_db.admins)
├── Separate auth flow
├── MFA required
├── Platform-wide management
└── Assigns Users as Operators
         │
         │ assigns
         ▼
User / Operator (Service)
├── Unified DB (identity_db.accounts)
├── Same auth flow
├── MFA optional
│
├── User: Service consumers
└── Operator: User + role (Admin assigned)

Same account, same password, same MFA
```

## Related Documents

| Topic        | Document                                         |
| ------------ | ------------------------------------------------ |
| Architecture | `docs/en/guides/enterprise-auth-architecture.md` |
| Auth Flows   | `docs/en/guides/enterprise-auth-flows.md`        |
| Security     | `docs/en/guides/enterprise-auth-security.md`     |
| Identity     | `docs/en/policies/identity-platform.md`          |
| Security     | `docs/en/policies/security.md`                   |

## Standards Reference

| Standard     | Description                       |
| ------------ | --------------------------------- |
| RFC 9700     | OAuth 2.1                         |
| RFC 9449     | DPoP                              |
| RFC 9068     | JWT Best Practices                |
| RFC 6238     | TOTP                              |
| NIST 800-63B | Digital Identity Guidelines       |
| OWASP ASVS   | Application Security Verification |

## Glossary

| Term | Definition                        |
| ---- | --------------------------------- |
| BFF  | Backend for Frontend              |
| DPoP | Demonstrating Proof of Possession |
| MFA  | Multi-Factor Authentication       |
| RBAC | Role-Based Access Control         |
| RTR  | Refresh Token Rotation            |
| TOTP | Time-based One-Time Password      |

---

_This document is auto-generated from `docs/llm/guides/enterprise-auth-overview.md`_
