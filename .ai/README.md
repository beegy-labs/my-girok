# AI Assistant Navigation

> LLM-optimized pointers | **Last Updated**: 2026-01-11

**Manifest**: [manifest.yaml](manifest.yaml) | **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## 4-Tier Documentation

| Tier | Path        | Editable | Purpose                 |
| ---- | ----------- | -------- | ----------------------- |
| 1    | `.ai/`      | Yes      | Quick lookup (50 lines) |
| 2    | `docs/llm/` | Yes      | SSOT (token-optimized)  |
| 3    | `docs/en/`  | No       | Human docs (generated)  |
| 4    | `docs/kr/`  | No       | Korean (translated)     |

## Core Files

| File                                   | Purpose         |
| -------------------------------------- | --------------- |
| [rules.md](rules.md)                   | DO/DON'T rules  |
| [architecture.md](architecture.md)     | System patterns |
| [authorization.md](authorization.md)   | ReBAC + OpenFGA |
| [best-practices.md](best-practices.md) | 2026 checklist  |

## Services

| Service               | Port | File                                                                   |
| --------------------- | ---- | ---------------------------------------------------------------------- |
| authorization-service | 3012 | [services/authorization-service.md](services/authorization-service.md) |
| identity-service      | 3005 | [services/identity-service.md](services/identity-service.md)           |
| auth-service          | 3001 | [services/auth-service.md](services/auth-service.md)                   |
| personal-service      | 4002 | [services/personal-service.md](services/personal-service.md)           |

## Packages

| Package       | File                                                   |
| ------------- | ------------------------------------------------------ |
| nest-common   | [packages/nest-common.md](packages/nest-common.md)     |
| types         | [packages/types.md](packages/types.md)                 |
| design-tokens | [packages/design-tokens.md](packages/design-tokens.md) |

## Apps

| App       | File                                   |
| --------- | -------------------------------------- |
| web-main  | [apps/web-main.md](apps/web-main.md)   |
| web-admin | [apps/web-admin.md](apps/web-admin.md) |

**Policy**: `docs/llm/policies/documentation-architecture.md`
