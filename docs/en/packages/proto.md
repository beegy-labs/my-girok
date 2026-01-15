# @my-girok/proto

> Protocol Buffers definitions for inter-service gRPC communication

## Overview

The proto package contains Protocol Buffer definitions that enable type-safe gRPC communication between microservices. All service-to-service communication uses these shared definitions to ensure consistency across the platform.

## Directory Structure

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

## Available Services

### Identity Service (identity.v1)

The Identity service handles account, session, device, and profile management operations.

| RPC                 | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `GetAccount`        | Retrieve account details by ID                   |
| `ValidateAccount`   | Check if an account exists and is in good status |
| `GetAccountByEmail` | Look up an account using email address           |
| `ValidateSession`   | Verify a session token is valid and active       |
| `RevokeSession`     | Invalidate a specific session                    |
| `RevokeAllSessions` | Invalidate all sessions for a user               |
| `GetAccountDevices` | List all trusted devices for an account          |
| `TrustDevice`       | Mark a device as trusted                         |
| `RevokeDevice`      | Remove trust status from a device                |
| `GetProfile`        | Retrieve user profile information                |

### Auth Service (auth.v1)

The Auth service manages permissions, roles, operators, and sanctions.

| RPC                      | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `CheckPermission`        | Verify if a user has a specific permission       |
| `CheckPermissions`       | Verify multiple permissions in a single call     |
| `GetOperatorPermissions` | Retrieve all permissions assigned to an operator |
| `GetRole`                | Get role details by ID                           |
| `GetRolesByOperator`     | List all roles assigned to an operator           |
| `GetOperator`            | Retrieve operator information by ID              |
| `ValidateOperator`       | Check if an operator account is valid and active |
| `CheckSanction`          | Determine if a user is under active sanctions    |
| `GetActiveSanctions`     | List all active sanctions for a user             |

### Legal Service (legal.v1)

The Legal service handles consent management, legal documents, and compliance requirements.

| RPC                    | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `CheckConsents`        | Verify all required consents are granted       |
| `GetAccountConsents`   | Retrieve all consents for an account           |
| `GrantConsent`         | Record user consent for a specific document    |
| `RevokeConsent`        | Remove previously granted consent              |
| `GetCurrentDocument`   | Get the current version of a legal document    |
| `GetDocumentVersion`   | Retrieve a specific version of a document      |
| `ListDocuments`        | List all available legal documents             |
| `GetLawRequirements`   | Get legal requirements for a jurisdiction      |
| `GetCountryCompliance` | Retrieve compliance requirements for a country |
| `CreateDsrRequest`     | Create a Data Subject Request (GDPR)           |
| `GetDsrRequest`        | Check the status of a DSR request              |
| `GetDsrDeadline`       | Get the deadline for completing a DSR          |

### Audit Service (audit.v1)

The Audit service handles compliance logging and audit trail queries.

| RPC                  | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `LogEvent`           | Record an audit event                        |
| `GetEvents`          | Query audit events with filters              |
| `GetEventsByAccount` | Retrieve the complete audit trail for a user |

## Commands

The following commands are available for working with proto files:

```bash
pnpm --filter @my-girok/proto lint      # Lint proto files
pnpm --filter @my-girok/proto format    # Format proto files
pnpm --filter @my-girok/proto generate  # Generate TS types → packages/types
pnpm --filter @my-girok/proto breaking  # Check breaking changes
```

## Style Guide

Protocol Buffer definitions must follow these conventions:

- **Field names**: Use `snake_case` (e.g., `account_id`, `created_at`)
- **Message names**: Use `PascalCase` (e.g., `GetAccountRequest`, `SessionInfo`)
- **Enum names**: Use `PascalCase` (e.g., `AccountStatus`)
- **Enum values**: Use `SCREAMING_SNAKE_CASE` with the enum name as prefix (e.g., `ACCOUNT_STATUS_ACTIVE`)

## Versioning

Proto packages use semantic versioning in their paths. The current version is `v1` for all services (e.g., `identity.v1`, `auth.v1`).

When making breaking changes to a service definition:

1. Create a new version directory (e.g., `identity/v2/`)
2. Define the updated message types and services
3. Keep the old version available for backwards compatibility
4. Update consumers to migrate to the new version over time

---

**LLM Reference**: `docs/llm/packages/proto.md`
