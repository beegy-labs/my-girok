# AI Assistant Navigation

> LLM-optimized pointers for multi-LLM assistants

**Last Updated**: 2026-01-07 | **Manifest**: [manifest.yaml](manifest.yaml) | **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## 4-Tier Documentation (2026)

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

| Tier | Path        | Editable | Purpose                    |
| ---- | ----------- | -------- | -------------------------- |
| 1    | `.ai/`      | **Yes**  | Quick lookup (30-50 lines) |
| 2    | `docs/llm/` | **Yes**  | SSOT (token-optimized)     |
| 3    | `docs/en/`  | **No**   | Human-readable (generated) |
| 4    | `docs/kr/`  | **No**   | Korean (translated)        |

## Edit Rules

| DO                           | DO NOT                   |
| ---------------------------- | ------------------------ |
| Edit `.ai/` directly         | Edit `docs/en/` directly |
| Edit `docs/llm/` directly    | Edit `docs/kr/` directly |
| Link to `docs/llm/` for SSOT | Skip generation step     |

## .ai/ Format Guidelines

```yaml
max_lines: 50
content: [tables, commands, code_snippets]
avoid: [explanations, tutorials, detailed_examples]
link_pattern: '**SSOT**: docs/llm/... | **Full docs**: docs/en/...'
```

## Quick Links

### Core (READ FIRST)

| File                                   | Purpose         |
| -------------------------------------- | --------------- |
| [rules.md](rules.md)                   | DO/DON'T rules  |
| [architecture.md](architecture.md)     | System patterns |
| [best-practices.md](best-practices.md) | 2026 checklist  |

### Infrastructure

| File                                         | Purpose         |
| -------------------------------------------- | --------------- |
| [caching.md](caching.md)                     | Valkey patterns |
| [ci-cd.md](ci-cd.md)                         | GitHub Actions  |
| [docker-deployment.md](docker-deployment.md) | Docker Compose  |
| [helm-deployment.md](helm-deployment.md)     | K8s/Helm        |
| [testing.md](testing.md)                     | TDD patterns    |
| [git-flow.md](git-flow.md)                   | Branch strategy |

### Services

| File                                                           | Port | SSOT                                     |
| -------------------------------------------------------------- | ---- | ---------------------------------------- |
| [services/identity-service.md](services/identity-service.md)   | 3005 | `docs/llm/services/identity-service.md`  |
| [services/auth-service.md](services/auth-service.md)           | 3001 | `docs/llm/services/auth-service.md`      |
| [services/legal-service.md](services/legal-service.md)         | 3006 | `docs/llm/services/legal-service.md`     |
| [services/personal-service.md](services/personal-service.md)   | 4002 | `docs/llm/services/personal-service.md`  |
| [services/audit-service.md](services/audit-service.md)         | 3010 | `docs/llm/services/audit-service.md`     |
| [services/analytics-service.md](services/analytics-service.md) | 3011 | `docs/llm/services/analytics-service.md` |

### Packages

| File                                                   | SSOT                                 |
| ------------------------------------------------------ | ------------------------------------ |
| [packages/design-tokens.md](packages/design-tokens.md) | `docs/llm/packages/design-tokens.md` |
| [packages/nest-common.md](packages/nest-common.md)     | `docs/llm/packages/nest-common.md`   |
| [packages/types.md](packages/types.md)                 | `docs/llm/packages/types.md`         |
| [packages/ui-components.md](packages/ui-components.md) | `docs/llm/packages/ui-components.md` |

### Apps

| File                                   | SSOT                         |
| -------------------------------------- | ---------------------------- |
| [apps/web-main.md](apps/web-main.md)   | `docs/llm/apps/web-main.md`  |
| [apps/web-admin.md](apps/web-admin.md) | `docs/llm/apps/web-admin.md` |
| [apps/storybook.md](apps/storybook.md) | `docs/llm/apps/storybook.md` |

## Task Navigation

| Task               | Read                                    | SSOT                              |
| ------------------ | --------------------------------------- | --------------------------------- |
| Authentication     | `rules.md` + `services/auth-service.md` | `docs/llm/services/`              |
| Resume feature     | `services/personal-service.md`          | `docs/llm/services/`              |
| Database migration | `caching.md`                            | `docs/llm/policies/database.md`   |
| Add caching        | `caching.md`                            | `docs/llm/policies/caching.md`    |
| Deploy to K8s      | `helm-deployment.md`                    | `docs/llm/policies/deployment.md` |
| Create PR          | `git-flow.md`                           | `docs/llm/guides/`                |

## Architecture

```
Cilium Gateway API
       │
┌──────┼──────┬──────────────┬────────────┐
│      │      │              │            │
▼      ▼      ▼              ▼            ▼
Identity  Auth   Personal   Audit    Analytics
:3005   :3001    :4002     :3010      :3011
  │        │        │          │          │
  ▼        ▼        ▼          ▼          ▼
PostgreSQL (3 DBs)    PostgreSQL  ClickHouse (2 DBs)
```

## Token Budget

| Directory   | Tokens | Purpose                |
| ----------- | ------ | ---------------------- |
| `.ai/`      | ~2K    | Quick lookup           |
| `docs/llm/` | ~30K   | SSOT (editable)        |
| `docs/en/`  | ~73K   | Human docs (generated) |

---

**Documentation Policy**: `docs/llm/policies/documentation-architecture.md`
