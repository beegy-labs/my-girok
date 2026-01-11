# @my-girok/types

> Shared TypeScript types - SSOT for all services | **Last Updated**: 2026-01-11

## Structure

| Directory          | Contents                                           |
| ------------------ | -------------------------------------------------- |
| `identity/`        | Account, Session, Device, Profile, IIdentityModule |
| `auth/`            | Role, Permission, Sanction, IRoleService           |
| `legal/`           | ConsentType, DsrRequest, IConsentService           |
| `admin/`           | Operator, AdminJwtPayload                          |
| `resume/`          | Resume, Experience, Skill, Education               |
| `events/`          | DomainEvent, IdentityEventType, AuthEventType      |
| `common/`          | ApiResponse, PaginatedResponse                     |
| `generated/proto/` | Auto-generated from proto (pnpm generate)          |

## Key Types

| Category     | Types                                                     |
| ------------ | --------------------------------------------------------- |
| Status Enums | `AccountStatus`, `SessionStatus`, `SanctionStatus`        |
| Auth         | `UserJwtPayload`, `AdminJwtPayload`, `OperatorJwtPayload` |
| Legal        | `ConsentType`, `ConsentScope`, `DsrRequestType`           |
| Events       | `DomainEvent<T>`, `USER_REGISTERED`, `CONSENT_GRANTED`    |

**SSOT**: `docs/llm/packages/types.md`
