# @my-girok/proto

> Protocol Buffers definitions for gRPC services | **Last Updated**: 2026-01-11

## Structure

| Directory   | Service                               |
| ----------- | ------------------------------------- |
| `identity/` | Identity service (accounts, sessions) |
| `auth/`     | Auth service (RBAC, operators)        |
| `legal/`    | Legal service (consent, DSR)          |
| `audit/`    | Audit service (compliance logs)       |
| `common/`   | Shared types (pagination, errors)     |

## Commands

```bash
pnpm --filter @my-girok/proto generate  # Generate TS types
pnpm --filter @my-girok/proto lint      # Lint proto files
```

**SSOT**: `docs/llm/packages/proto.md`
