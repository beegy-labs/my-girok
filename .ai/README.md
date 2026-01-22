# AI Assistant Navigation

> CDD Tier 1 - Indicator (≤50 lines) | Multi-LLM Compatible

## Tier 1 Role

| Rule        | Description                                    |
| ----------- | ---------------------------------------------- |
| Max Lines   | ≤50 lines per file                             |
| Purpose     | Quick reference, SSOT links                    |
| Detail      | Refer to `docs/llm/` (Tier 2)                  |
| Methodology | `docs/llm/policies/development-methodology.md` |

## Core Files

| File                                   | Purpose         |
| -------------------------------------- | --------------- |
| [rules.md](rules.md)                   | DO/DON'T rules  |
| [architecture.md](architecture.md)     | System patterns |
| [best-practices.md](best-practices.md) | 2026 checklist  |

## Services

| Service               | Port | File                                                                   |
| --------------------- | ---- | ---------------------------------------------------------------------- |
| auth-bff              | 4005 | [services/auth-bff.md](services/auth-bff.md)                           |
| authorization-service | 3012 | [services/authorization-service.md](services/authorization-service.md) |
| identity-service      | 3005 | [services/identity-service.md](services/identity-service.md)           |
| auth-service          | 3002 | [services/auth-service.md](services/auth-service.md)                   |
| personal-service      | 4002 | [services/personal-service.md](services/personal-service.md)           |

## Packages & Apps

| Type    | Name          | File                                                   |
| ------- | ------------- | ------------------------------------------------------ |
| Package | types         | [packages/types.md](packages/types.md)                 |
| Package | design-tokens | [packages/design-tokens.md](packages/design-tokens.md) |
| App     | web-girok     | [apps/web-girok.md](apps/web-girok.md)                 |
| App     | web-admin     | [apps/web-admin.md](apps/web-admin.md)                 |

## Quick Links

| Topic    | Tier 2 SSOT                                  |
| -------- | -------------------------------------------- |
| Database | `docs/llm/policies/database.md`              |
| Testing  | `docs/llm/policies/testing.md`               |
| Errors   | `docs/llm/guides/frontend-error-handling.md` |

**CDD Policy**: `docs/llm/policies/cdd.md`
