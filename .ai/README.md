# AI Assistant Navigation

> LLM-optimized documentation for multi-LLM assistants

**Last Updated**: 2026-01-06 | **Manifest**: [manifest.yaml](manifest.yaml) | **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Documentation Policy

### `.ai/` = LLM Quick Reference (30-50 lines max)

```
Purpose: Token-efficient, pattern-focused, instant lookup
Format:  Tables, commands, code snippets only
Avoid:   Explanations, tutorials, detailed examples
Link:    Always end with "**Full guide**: docs/..."
```

### `docs/` = Detailed Documentation (Human + LLM)

```
Purpose: Complete guides, policies, tutorials
Format:  Explanations, examples, troubleshooting
Audience: Human developers + LLM when details needed
```

### Writing Guidelines

| .ai/ Files            | docs/ Files                 |
| --------------------- | --------------------------- |
| 30-50 lines max       | 100-500 lines               |
| Tables & commands     | Explanations & examples     |
| No "why", only "what" | Why + How + Troubleshooting |
| Link to docs/         | Link to .ai/ for quick ref  |

**Example `.ai/` structure:**

```markdown
# Topic

> One-line description

## Commands

table or code block

## Key Patterns

table only

---

**Full guide**: docs/path/FILE.md
```

### Service Document Template

All service docs in `.ai/services/` follow this structure:

| Section           | Required | Notes                             |
| ----------------- | -------- | --------------------------------- |
| Service Info      | Yes      | Port, DB, Cache, Events, Codebase |
| Domain Boundaries | Yes      | This Service / NOT This Service   |
| REST API          | Yes      | Endpoints only                    |
| gRPC Server       | Yes      | N/A if REST only                  |
| Database Tables   | Yes      | Table + Purpose                   |
| Events            | Yes      | N/A if none                       |
| Caching           | Yes      | Key pattern + TTL                 |
| Environment       | Yes      | Required env vars                 |

**Template**: `.ai/templates/service.md`

### Link Validation

Pre-commit hook validates markdown links:

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Manual check
npx markdown-link-check .ai/**/*.md
```

---

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
| [database.md](database.md)                   | goose commands  |
| [caching.md](caching.md)                     | Valkey patterns |
| [ci-cd.md](ci-cd.md)                         | GitHub Actions  |
| [docker-deployment.md](docker-deployment.md) | Docker Compose  |
| [helm-deployment.md](helm-deployment.md)     | K8s/Helm        |
| [testing.md](testing.md)                     | TDD patterns    |
| [git-flow.md](git-flow.md)                   | Branch strategy |

### Services

| File                                                           | Purpose            |
| -------------------------------------------------------------- | ------------------ |
| [services/identity-service.md](services/identity-service.md)   | Accounts, sessions |
| [services/auth-service.md](services/auth-service.md)           | RBAC, operators    |
| [services/legal-service.md](services/legal-service.md)         | Consents, DSR      |
| [services/personal-service.md](services/personal-service.md)   | Resume             |
| [services/audit-service.md](services/audit-service.md)         | Compliance logging |
| [services/analytics-service.md](services/analytics-service.md) | Business analytics |

### Frontend & Packages

| File                                                   | Purpose          |
| ------------------------------------------------------ | ---------------- |
| [apps/web-main.md](apps/web-main.md)                   | React web app    |
| [packages/design-tokens.md](packages/design-tokens.md) | WCAG tokens      |
| [packages/nest-common.md](packages/nest-common.md)     | NestJS utilities |

---

## Task Navigation

| Task               | Read                                    |
| ------------------ | --------------------------------------- |
| Authentication     | `rules.md` + `services/auth-service.md` |
| Resume feature     | `services/personal-service.md`          |
| Database migration | `database.md`                           |
| Add caching        | `caching.md`                            |
| Deploy to K8s      | `helm-deployment.md`                    |
| Create PR          | `git-flow.md`                           |
| Add tests          | `testing.md`                            |

---

## Architecture

```
Cilium Gateway API
       │
┌──────┼──────┬──────────────┬────────────┐
│      │      │              │            │
▼      ▼      ▼              ▼            ▼
Identity  Auth   Personal   Audit    Analytics
Service  Service  Service   Service   Service
  │        │        │          │          │
  ▼        ▼        ▼          ▼          ▼
PostgreSQL (3 DBs)    PostgreSQL  ClickHouse (2 DBs)
```

**Token Budget**: `.ai/` ~2K tokens, `docs/` ~73K tokens
