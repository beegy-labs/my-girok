# @my-girok/proto

> Protocol Buffers for gRPC | Cached via Gitea | **Last Updated**: 2026-01-18

| Directory   | Service  | Caching           | Time  |
| ----------- | -------- | ----------------- | ----- |
| `identity/` | Accounts | Gitea Generic Pkg | 15s ↓ |
| `auth/`     | RBAC     | Hash: SHA256(12)  | 33s ↑ |
| `legal/`    | Consent  | Size: ~100KB      |       |
| `audit/`    | Logs     |                   |       |
| `common/`   | Shared   |                   |       |

**CI**: `.github/workflows/build-proto.yml`
**Speedup**: 59-67% faster (vs Buf rate limit)

```bash
pnpm --filter @my-girok/proto generate  # TS types
pnpm --filter @my-girok/proto lint      # Lint
```

**SSOT**: `docs/llm/policies/proto-caching.md`
