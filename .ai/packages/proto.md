# @my-girok/proto

> Protocol Buffers definitions for gRPC services | **Last Updated**: 2026-01-18

## Structure

| Directory   | Service                               |
| ----------- | ------------------------------------- |
| `identity/` | Identity service (accounts, sessions) |
| `auth/`     | Auth service (RBAC, operators)        |
| `legal/`    | Legal service (consent, DSR)          |
| `audit/`    | Audit service (compliance logs)       |
| `common/`   | Shared types (pagination, errors)     |

## CI/CD Caching

| Method                       | Status    |
| ---------------------------- | --------- |
| Gitea Generic Package (hash) | Active ✅ |
| Build time                   | 33s       |
| Download time                | 15s       |
| Package size                 | ~100KB    |

**Build workflow**: `.github/workflows/build-proto.yml`
**Hash**: First 12 chars of SHA256 (proto + buf config files)

## Commands

```bash
pnpm --filter @my-girok/proto generate  # Generate TS types
pnpm --filter @my-girok/proto lint      # Lint proto files
```

**SSOT**: `docs/llm/policies/proto-caching.md`
