# CLAUDE.md

> **AI Assistant Entry Point for my-girok project** | **Last Updated**: 2026-01-06

**Manifest**: [.ai/manifest.yaml](.ai/manifest.yaml) | **Changelog**: [.ai/CHANGELOG.md](.ai/CHANGELOG.md)

## Quick Start

**Start here**: [.ai/README.md](.ai/README.md) - Navigation for all AI documentation

## Essential Reading

**For ANY task, read these first:**

1. **[.ai/rules.md](.ai/rules.md)** - Core DO/DON'T rules (CRITICAL)
2. **[.ai/best-practices.md](.ai/best-practices.md)** - 2026 Best Practices (monthly review)
3. **[.ai/architecture.md](.ai/architecture.md)** - Architecture patterns and routing
4. **[docs/test-coverage.md](docs/test-coverage.md)** - Test coverage status & pending tests

### Testing Requirements

**All code changes MUST include tests.** Check `docs/test-coverage.md` for:

- Current coverage status per service
- Pending tests that need to be written
- Files excluded from coverage (and why)

## Task-Based Navigation

### Backend Development

**Working on authentication?**
Read: `.ai/rules.md` + `.ai/services/auth-service.md`
Future: `.ai/services/identity-service.md`

**Working on Identity Platform (multi-app user management)?**
Read: `.ai/services/identity-service.md` + `.ai/architecture.md`
Policy: `docs/llm/policies/identity-platform.md`

**Working on resume/profile?**
Read: `.ai/rules.md` + `.ai/services/personal-service.md`

**Working on audit/compliance logging?**
Read: `.ai/rules.md` + `.ai/services/audit-service.md`
Full guide: `docs/en/services/audit-service.md`

**Working on analytics/business intelligence?**
Read: `.ai/rules.md` + `.ai/services/analytics-service.md`
Full guide: `docs/en/services/analytics-service.md`

### Frontend Development

**Working on web app?**
Read: `.ai/rules.md` + `.ai/apps/web-main.md`

**Working on design tokens/styling?**
Read: `.ai/ssot.md` + `.ai/packages/design-tokens.md`

**Working on Storybook?**
Read: `.ai/apps/storybook.md`

**Working on i18n/localization?**
Read: `.ai/i18n-locale.md` + `.ai/apps/web-main.md`

### Database & Deployment

**Working on database migrations?**
Read: `.ai/database.md` + `.ai/rules.md` (Database Migrations section)
Policy: `docs/llm/policies/database.md`

**Working on Helm/Kubernetes deployment?**
Read: `.ai/helm-deployment.md` + `.ai/ci-cd.md`

### Caching & Performance

**Working on caching with Valkey/Redis?**
Read: `.ai/caching.md`
Full guide: `docs/llm/policies/caching.md`

### Other Tasks

**Creating a PR?**
Read: `.ai/pull-requests.md` + `.ai/git-flow.md`

**Working on resume features?**
Read: `.ai/resume.md` + `.ai/services/personal-service.md`

**Working on legal/consent features?**
Read: `.ai/services/auth-service.md` (Legal API section) + `.ai/packages/types.md`
Policy: `docs/llm/policies/legal-consent.md`

**Adding fonts or external resources?**
Read: `.ai/packages/design-tokens.md` + `.ai/rules.md` (Resources section)
Policy: `docs/llm/policies/external-resources.md`

## Documentation Policy (2026) - CRITICAL

### 4-Tier Structure

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

| Tier | Path        | Editable | Format                      |
| ---- | ----------- | -------- | --------------------------- |
| 1    | `.ai/`      | **Yes**  | Tables, links, max 50 lines |
| 2    | `docs/llm/` | **Yes**  | YAML, tables, code (SSOT)   |
| 3    | `docs/en/`  | **No**   | Prose, examples (generated) |
| 4    | `docs/kr/`  | **No**   | Korean translation          |

### Edit Rules

| DO                                          | DO NOT                   |
| ------------------------------------------- | ------------------------ |
| Edit `.ai/` directly                        | Edit `docs/en/` directly |
| Edit `docs/llm/` directly                   | Edit `docs/kr/` directly |
| Run `pnpm docs:generate` after llm/ changes | Skip generation step     |
| Run `pnpm docs:translate` after en/ changes | Skip translation step    |

### Generation Flow

```bash
# 1. Edit SSOT
vim docs/llm/services/example.md

# 2. Generate English docs
pnpm docs:generate                    # docs/llm → docs/en

# 3. Translate to Korean
pnpm docs:translate --locale kr       # docs/en → docs/kr
```

### CLI Options

| Command          | Options                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `docs:generate`  | `--force`, `--file <path>`, `--retry-failed`, `--clean`, `--provider`  |
| `docs:translate` | `--locale`, `--file <path>`, `--retry-failed`, `--clean`, `--provider` |

### Error Recovery

```bash
# Retry only failed files
pnpm docs:generate --retry-failed
pnpm docs:translate --locale kr --retry-failed

# Restart all (clear history)
pnpm docs:generate --clean
pnpm docs:translate --locale kr --clean
```

### Update Requirements

| Change Type        | .ai/ Update        | docs/llm/ Update   |
| ------------------ | ------------------ | ------------------ |
| New component/hook | apps/ or packages/ | -                  |
| New API endpoint   | services/          | services/          |
| New pattern        | rules.md           | -                  |
| Major feature      | relevant file      | guides/            |
| New policy         | rules.md summary   | policies/ full doc |

**Full policy**: `docs/llm/policies/documentation-architecture.md`

## Directory Structure

```
my-girok/
├── CLAUDE.md                 # <- You are here (Entry point)
├── README.md                 # Project introduction
│
├── .ai/                      # LLM-optimized docs (EDITABLE)
│   ├── README.md             # Navigation guide
│   ├── rules.md              # Core rules (READ FIRST)
│   ├── architecture.md       # Architecture patterns
│   ├── best-practices.md     # 2026 Best Practices
│   ├── caching.md            # Valkey/Redis caching patterns
│   ├── database.md           # goose + ArgoCD migration strategy
│   ├── ssot.md               # Single Source of Truth strategy
│   ├── i18n-locale.md        # Internationalization & Locale
│   ├── resume.md             # Resume feature documentation
│   ├── user-preferences.md   # User preferences system
│   ├── pull-requests.md      # PR guidelines
│   ├── services/             # Backend service APIs
│   ├── packages/             # Shared packages
│   └── apps/                 # Frontend app guides
│
├── docs/llm/                 # SSOT - LLM optimized (EDITABLE)
│   ├── policies/             # Policy definitions
│   ├── services/             # Service documentation
│   ├── guides/               # Technical guides
│   └── packages/             # Package documentation
│
├── docs/en/                  # Human-readable (GENERATED - DO NOT EDIT)
│   ├── policies/             # Detailed policies
│   ├── services/             # Service docs
│   ├── guides/               # Tutorials
│   └── packages/             # Package docs
│
└── docs/kr/                  # Korean translation (GENERATED - DO NOT EDIT)
```

## Key Principles

### Language Policy

**ALL code, documentation, and commits MUST be in English**

### Git Branch & Merge Policy (GitFlow Standard)

```
feat/* ──squash──> develop ──merge──> release ──merge──> main
                    (Dev)    (Staging)   (Prod)
```

| Source -> Target   | Merge Type | Command                |
| ------------------ | ---------- | ---------------------- |
| feat -> develop    | Squash     | `gh pr merge --squash` |
| develop -> release | Merge      | `gh pr merge --merge`  |
| release -> main    | Merge      | `gh pr merge --merge`  |

Full details: [.ai/git-flow.md](.ai/git-flow.md)

### Git Commit Policy

**NEVER mention AI assistance in commit messages**

- Do NOT include "Generated with Claude" or similar references
- Do NOT add "Co-Authored-By: Claude" or AI attribution
- Write commit messages as if written by a human developer
- Keep commits professional and focused on the change itself

### Architecture

- Full BFF Pattern (IETF recommended, session-based auth)
- GraphQL Federation for API aggregation
- gRPC for internal service communication
- Redpanda for event-driven messaging (Kafka-compatible, no JVM)
- Cilium Gateway API for edge routing

### Development

- Types first (`packages/types`)
- `@Transactional()` for multi-step DB ops
- 80% test coverage minimum
- Sealed Secrets for K8s

### Stack

- **Web**: React 19.2, TypeScript 5.9, Tailwind CSS 4.1, Vite 7.2
- **Mobile**: iOS (Swift), Android (Kotlin), Flutter (cross-platform)
- **Backend**: Node.js 24, NestJS 11
- **Database**: PostgreSQL 16 + Prisma 6 + Redis
- **AI**: Python 3.13, FastAPI
- **Deploy**: Kubernetes, Kustomize

## Need More Detail?

**2026 Best Practices** -> `docs/llm/policies/best-practices-2026.md`
**Database migrations** -> `docs/llm/policies/database.md`
**Security policies** -> `docs/llm/policies/security.md`
**Testing standards** -> `docs/llm/policies/testing.md`
**Performance tips** -> `docs/llm/policies/performance.md`
**Deployment guide** -> `docs/llm/policies/deployment.md`
**External resources** -> `docs/llm/policies/external-resources.md`

## Token Optimization

- **Read .ai/ for coding** - Patterns, APIs, flows
- **Refer to docs/ for policies** - Detailed guides, tutorials

**Always prefer .ai/ documentation for implementation tasks.**

---

**Ready to code? Start with [.ai/README.md](.ai/README.md)**
