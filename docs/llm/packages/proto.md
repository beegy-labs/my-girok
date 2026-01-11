# @my-girok/proto

Protocol Buffers definitions for inter-service gRPC communication.

## Structure

```
packages/proto/
├── buf.yaml              # Buf configuration
├── buf.gen.yaml          # Code generation settings
├── identity/v1/          # Identity service
├── auth/v1/              # Auth service
├── legal/v1/             # Legal service
├── audit/v1/             # Audit service
└── common/v1/            # Shared types
```

## Services

### identity.v1 - Identity Service

Account, session, device, and profile management:

| RPC                 | Purpose                  |
| ------------------- | ------------------------ |
| `GetAccount`        | Get account by ID        |
| `ValidateAccount`   | Validate account status  |
| `GetAccountByEmail` | Lookup by email          |
| `ValidateSession`   | Validate session token   |
| `RevokeSession`     | Revoke specific session  |
| `RevokeAllSessions` | Revoke all user sessions |
| `GetAccountDevices` | List trusted devices     |
| `TrustDevice`       | Mark device as trusted   |
| `RevokeDevice`      | Revoke device trust      |
| `GetProfile`        | Get user profile         |

### auth.v1 - Auth Service

Permission, role, operator, and sanction management:

| RPC                      | Purpose                    |
| ------------------------ | -------------------------- |
| `CheckPermission`        | Check single permission    |
| `CheckPermissions`       | Check multiple permissions |
| `GetOperatorPermissions` | Get operator permissions   |
| `GetRole`                | Get role by ID             |
| `GetRolesByOperator`     | Get roles for operator     |
| `GetOperator`            | Get operator by ID         |
| `ValidateOperator`       | Validate operator status   |
| `CheckSanction`          | Check user sanction status |
| `GetActiveSanctions`     | Get active sanctions       |

### legal.v1 - Legal Service

Consent, document, and compliance management:

| RPC                    | Purpose                 |
| ---------------------- | ----------------------- |
| `CheckConsents`        | Check required consents |
| `GetAccountConsents`   | Get user consents       |
| `GrantConsent`         | Grant consent           |
| `RevokeConsent`        | Revoke consent          |
| `GetCurrentDocument`   | Get current legal doc   |
| `GetDocumentVersion`   | Get specific version    |
| `ListDocuments`        | List all documents      |
| `GetLawRequirements`   | Get law requirements    |
| `GetCountryCompliance` | Get country compliance  |
| `CreateDsrRequest`     | Create DSR request      |
| `GetDsrRequest`        | Get DSR status          |
| `GetDsrDeadline`       | Get DSR deadline        |

### audit.v1 - Audit Service

Compliance logging:

| RPC                  | Purpose                |
| -------------------- | ---------------------- |
| `LogEvent`           | Log audit event        |
| `GetEvents`          | Query audit events     |
| `GetEventsByAccount` | Get user's audit trail |

## Commands

```bash
pnpm --filter @my-girok/proto lint      # Lint proto files
pnpm --filter @my-girok/proto format    # Format proto files
pnpm --filter @my-girok/proto generate  # Generate TS types → packages/types
pnpm --filter @my-girok/proto breaking  # Check breaking changes
```

## Style Guide

- Field names: `snake_case`
- Message/Enum names: `PascalCase`
- Enum values: `SCREAMING_SNAKE_CASE` with enum prefix

## Versioning

Proto packages use semantic versioning in paths (e.g., `identity.v1`).
Create new version for breaking changes (e.g., `identity.v2`).
